import { useState, useCallback, useEffect } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import {
  CHAT_STREAM,
  CREATE_CHAT,
  GET_CUR_PROJECT,
  TRIGGER_CHAT,
  SAVE_MESSAGE,
} from '@/graphql/request';
import { Message } from '@/const/MessageType';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { set } from 'react-hook-form';
import { debug } from 'console';
import { parseXmlToJson } from '@/utils/parser';
import { Chat, ChatInputType, Project } from '@/graphql/type';
import path from 'path';
import {
  leaderPrompt,
  findbugPrompt,
  refactorPrompt,
  optimizePrompt,
  editFilePrompt,
  codeReviewPrompt,
  commitChangesPrompt,
} from './agentPrompt';

export enum StreamStatus {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  DONE = 'DONE',
}

export interface SubscriptionState {
  enabled: boolean;
  variables: {
    input: ChatInputType;
  } | null;
}

export interface UseChatStreamProps {
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  selectedModel: string;
}

export function useChatStream({
  chatId,
  input,
  setInput,
  setMessages,
  selectedModel,
}: UseChatStreamProps) {
  const [isInsideJsonResponse, setIsInsideJsonResponse] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>(
    StreamStatus.IDLE
  );
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [cumulatedContent, setCumulatedContent] = useState<string>('');
  const [subscription, setSubscription] = useState<SubscriptionState>({
    enabled: false,
    variables: null,
  });
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskStep, setTaskStep] = useState('');
  const [fileStructure, setFileStructure] = useState<string[]>([]);
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>(
    {}
  );
  const [originalFileContents, setOriginalFileContents] = useState<{
    [key: string]: string;
  }>({});
  const [newFileContents, setNewFileContents] = useState<{
    [key: string]: string;
  }>({});

  const [curProject, setCurProject] = useState<Project | null>(null);

  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
    refetch,
  } = useQuery<{ getCurProject: Project }>(GET_CUR_PROJECT, {
    variables: { chatId: currentChatId },
    skip: !currentChatId,
  });

  useEffect(() => {
    setOriginalFileContents({});
    setFileContents({});
    setFileStructure([]);
    setTaskStep('');
    setTaskDescription('');
    setIsInsideJsonResponse(false);
    setCurrentChatId(chatId);
    console.log('chatId:', chatId);
    console.log('useEffect triggered');

    if (chatId) {
      refetch({ chatId }) // 移除 `variables` 包装，直接传递变量
        .then((result) => {
          if (result.data?.getCurProject) {
            console.log('getCurProject', result.data.getCurProject);
            setCurProject(result.data.getCurProject);
          }
        });
    }
  }, [chatId]);
  // 依赖 chatId 变化
  useEffect(() => {
    if (projectError) {
      console.error('useQuery Error:', projectError);
    }
  }, [projectError]);
  const updateChatId = () => {
    setCurrentChatId('');
  };

  window.addEventListener('newchat', updateChatId);

  const [triggerChat] = useMutation(TRIGGER_CHAT, {
    onCompleted: () => {
      setStreamStatus(StreamStatus.STREAMING);
    },
    onError: () => {
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    },
  });

  const [saveMessage] = useMutation(SAVE_MESSAGE);

  const [createChat] = useMutation(CREATE_CHAT, {
    onCompleted: async (data) => {
      const newChatId = data.createChat.id;
      setCurrentChatId(newChatId);
      await startChatStream(newChatId, input);
      window.history.pushState({}, '', `/chat?id=${newChatId}`);
      console.log(`new chat: ${newChatId}`);
    },
    onError: () => {
      toast.error('Failed to create chat');
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
    },
  });

  useSubscription(CHAT_STREAM, {
    skip: !subscription.enabled || !subscription.variables,
    variables: subscription.variables,
    onSubscriptionData: async ({ subscriptionData }) => {
      const chatStream = subscriptionData?.data?.chatStream;

      if (!chatStream) return;

      if (streamStatus === StreamStatus.STREAMING && loadingSubmit) {
        setLoadingSubmit(false);
      }

      const content = chatStream.choices?.[0]?.delta?.content;

      if (content) {
        setCumulatedContent((prev) => prev + content);
      }
      if (chatStream.status == StreamStatus.DONE) {
        setStreamStatus(StreamStatus.DONE);
        finishChatResponse();
        const parsedContent = parseXmlToJson(cumulatedContent);
        const process = parsedContent.thinking_process;
        saveMessage({
          variables: {
            input: {
              chatId: subscription.variables.input.chatId,
              message: process,
              model: subscription.variables.input.model,
              role: 'assistant',
            } as ChatInputType,
          },
        });

        const typewriterEffect = async (textArray: string[], delay: number) => {
          let index = 0;

          // implement typewriter effect
          const updateMessage = async () => {
            if (index < textArray.length) {
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                return lastMsg?.role === 'assistant'
                  ? [
                      ...prev.slice(0, -1),
                      {
                        ...lastMsg,
                        content: lastMsg.content + textArray[index],
                      },
                    ]
                  : [
                      ...prev,
                      {
                        id: chatStream.id,
                        role: 'assistant',
                        content: textArray[index],
                        createdAt: new Date(
                          chatStream.created * 1000
                        ).toISOString(),
                      },
                    ];
              });

              index++;
              setTimeout(updateMessage, delay);
            }
          };

          await updateMessage();
        };

        // break text into chunks of 3 characters
        const breakText = (text: string) => {
          return text.match(/(\S{1,3}|\s+)/g) || [];
        };

        const brokenText = breakText(process);
        await typewriterEffect(brokenText, 100);

        setCumulatedContent('');
        console.log(parsedContent);
        console.log('response json');
        switch (taskStep) {
          case 'task':
            taskAgent({
              chatId: subscription.variables.input.chatId,
              message: JSON.stringify(parsedContent),
              model: subscription.variables.input.model,
              role: 'assistant',
            });
            break;
          case 'read_file':
            editFileAgent({
              chatId: subscription.variables.input.chatId,
              message: JSON.stringify(parsedContent),
              model: subscription.variables.input.model,
              role: 'assistant',
            });
            break;
          case 'edit_file':
            codeReviewAgent({
              chatId: subscription.variables.input.chatId,
              message: JSON.stringify(parsedContent),
              model: subscription.variables.input.model,
              role: 'assistant',
            });
            break;
          case 'code_review':
            if (parsedContent.review_result === 'Correct Fix') {
              applyChangesAgent({
                chatId: subscription.variables.input.chatId,
                message: JSON.stringify(parsedContent),
                model: subscription.variables.input.model,
                role: 'assistant',
              });
            } else {
              editFileAgent({
                chatId: subscription.variables.input.chatId,
                message: JSON.stringify(parsedContent),
                model: subscription.variables.input.model,
                role: 'assistant',
              });
            }
            break;
        }
      }
    },
    onError: (error) => {
      console.log(error);
      toast.error('Connection error. Please try again.');
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    },
  });

  const startChatStream = async (targetChatId: string, message: string) => {
    try {
      const prompt = leaderPrompt(message);
      const userInput: ChatInputType = {
        chatId: targetChatId,
        message: message,
        model: selectedModel,
        role: 'user',
      };
      saveMessage({
        variables: {
          input: userInput as ChatInputType,
        },
      });
      const assistantInput: ChatInputType = {
        chatId: targetChatId,
        message: prompt,
        model: selectedModel,
        role: 'assistant',
      };
      console.log(input);

      setInput('');

      setTaskStep('task');
      setStreamStatus(StreamStatus.STREAMING);
      setSubscription({
        enabled: true,
        variables: {
          input: {
            chatId: targetChatId,
            message: prompt,
            model: selectedModel,
            role: 'assistant',
          },
        },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      await triggerChat({
        variables: {
          input: {
            chatId: targetChatId,
            message: prompt,
            model: selectedModel,
            role: 'assistant',
          },
        },
      });
    } catch (err) {
      toast.error('Failed to start chat');
      setStreamStatus(StreamStatus.IDLE);
      finishChatResponse();
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const content = input;

    if (!content.trim() || loadingSubmit) return;

    setLoadingSubmit(true);

    const messageId = currentChatId || 'temp-id';
    const newMessage: Message = {
      id: messageId,
      role: 'user',
      content: content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMessage]);

    if (!currentChatId) {
      console.log('currentChatId: ' + currentChatId);
      console.log('Creating new chat...');
      try {
        await createChat({
          variables: {
            input: {
              title: content.slice(0, 50),
            },
          },
        });
      } catch (error) {
        setLoadingSubmit(false);
        return;
      }
    } else {
      await startChatStream(currentChatId, content);
    }
  };

  const finishChatResponse = useCallback(() => {
    setLoadingSubmit(false);
    setSubscription({
      enabled: false,
      variables: null,
    });
    if (streamStatus === StreamStatus.DONE) {
      setStreamStatus(StreamStatus.IDLE);
    }
  }, [streamStatus]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    [setInput]
  );

  const stop = useCallback(() => {
    if (streamStatus === StreamStatus.STREAMING) {
      setSubscription({
        enabled: false,
        variables: null,
      });
      setStreamStatus(StreamStatus.IDLE);
      setLoadingSubmit(false);
      toast.info('Message generation stopped');
    }
  }, [streamStatus]);

  const taskAgent = useCallback(
    async (input: ChatInputType) => {
      console.log('taskAgent called with input:', input);
      const res = JSON.parse(input.message);
      const assignedTask = res.task_type;
      const description = res.description;
      setTaskStep(assignedTask);
      setTaskDescription(description);
      let promptInput: ChatInputType;
      let prompt: string;
      let tempFileStructure = fileStructure;
      console.log('taskAgent');
      console.log(assignedTask);
      switch (assignedTask) {
        case 'debug':
        case 'refactor':
        case 'optimize':
          if (!curProject) {
            console.error('Project not found');
            return;
          }

          if (!fileStructure || fileStructure.length === 0) {
            try {
              const response = await fetch(
                `/api/filestructure?path=${curProject.projectPath}`,
                {
                  method: 'GET',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                }
              );
              const fetchedFileStructure = await response.json();

              console.log('Fetched File Structure:', fetchedFileStructure.res);

              tempFileStructure = fetchedFileStructure.res;
              setFileStructure(tempFileStructure);
            } catch (error) {
              console.error('Error fetching file structure:', error);
            }
          }

          console.log('Start task');
          console.log('Assigned Task:', assignedTask);
          console.log('File Structure:', tempFileStructure);

          prompt =
            assignedTask === 'debug'
              ? findbugPrompt(description, tempFileStructure)
              : assignedTask === 'refactor'
                ? refactorPrompt(description, tempFileStructure)
                : optimizePrompt(description, tempFileStructure);

          promptInput = {
            chatId: input.chatId,
            message: prompt,
            model: input.model,
            role: 'assistant',
          } as unknown as ChatInputType;
          console.log('Prompt Input:', promptInput);
          setTaskStep('read_file');
          setStreamStatus(StreamStatus.STREAMING);
          setSubscription({
            enabled: true,
            variables: { input: promptInput },
          });
          await new Promise((resolve) => setTimeout(resolve, 100));
          await triggerChat({ variables: { input: promptInput } });
          break;
      }
    },
    [curProject, fileStructure]
  );

  const editFileAgent = useCallback(
    async (input: ChatInputType) => {
      console.log('editFileAgent called with input:', input);
      const filePaths: string[] = JSON.parse(input.message).files;
      // Create a local object to store file contents, keyed by filePath
      const currentFileContents: { [key: string]: string } = {
        ...fileContents,
      };

      await Promise.all(
        filePaths.map(async (filePath: string) => {
          if (!currentFileContents[filePath]) {
            const fpath = path.join(curProject.projectPath, filePath);
            const fetchedFileContent = await fetch(
              `/api/file?path=${encodeURIComponent(fpath)}`,
              {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
              }
            )
              .then((response) => response.json())
              .then((data) => data.content);
            console.log('Fetched File Content:', fetchedFileContent);
            console.log('File Path:', filePath);
            // Update the local object with the new key-value pair
            currentFileContents[filePath] = fetchedFileContent;
          }
        })
      );

      setFileContents(currentFileContents);
      setOriginalFileContents((prev) => ({ ...prev, ...currentFileContents }));

      console.log('All File Contents:', currentFileContents);
      // Pass the object (mapping filePath to content) to the prompt function
      const prompt = editFilePrompt(taskDescription, currentFileContents);
      const promptInput: ChatInputType = {
        chatId: input.chatId,
        message: prompt,
        model: input.model,
        role: 'assistant',
      };
      console.log('Prompt Input:', promptInput);
      setTaskStep('edit_file');
      setStreamStatus(StreamStatus.STREAMING);
      setSubscription({
        enabled: true,
        variables: { input: promptInput },
      });
      await new Promise((resolve) => setTimeout(resolve, 100));
      await triggerChat({ variables: { input: promptInput } });
    },
    [fileContents, taskDescription, curProject, triggerChat]
  );

  const applyChangesAgent = useCallback(
    async (input: ChatInputType) => {
      console.log('applyChangesAgent called with input:', input);
      const updatePromises = Object.keys(newFileContents).map(
        async (filePath) => {
          const newContent = newFileContents[filePath];
          console.log('Updating file:', filePath);
          console.log('New Content:', newContent);
          const fpath = path.join(curProject.projectPath, filePath);
          await fetch('/api/file', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filePath: fpath, newContent }),
          });
        }
      );

      await Promise.all(updatePromises);
      setTaskStep('apply_changes');
      toast.success('Changes applied successfully');
      commitChangesAgent({
        chatId: input.chatId,
        message: JSON.stringify(newFileContents),
        model: input.model,
        role: 'assistant',
      });
    },
    [newFileContents]
  );

  const codeReviewAgent = useCallback(async (input: ChatInputType) => {
    console.log('codeReviewAgent called with input:', input);

    let parsedMessage: { [key: string]: string } = {};

    try {
      if (typeof input.message === 'string') {
        const parsedObject = JSON.parse(input.message);

        if (
          parsedObject.modified_files &&
          typeof parsedObject.modified_files === 'object'
        ) {
          parsedMessage = parsedObject.modified_files;
        } else {
          console.error('modified_files is missing or not an object');
        }
      }
    } catch (error) {
      console.error('Failed to parse input.message:', error);
    }

    console.log('Parsed modified_files:', parsedMessage);

    console.log('Parsed Message:', parsedMessage);

    setNewFileContents((prev) => ({ ...prev, ...parsedMessage }));

    const formattedMessage = Object.entries(parsedMessage)
      .map(
        ([filePath, content]) =>
          `### File: ${filePath}\n\`\`\`\n${content}\n\`\`\``
      )
      .join('\n\n');

    const prompt = codeReviewPrompt(formattedMessage);

    const promptInput: ChatInputType = {
      chatId: input.chatId,
      message: prompt,
      model: input.model,
      role: 'assistant',
    };

    console.log('Prompt Input:', promptInput);
    setTaskStep('code_review');
    setStreamStatus(StreamStatus.STREAMING);
    setSubscription({
      enabled: true,
      variables: { input: promptInput },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    await triggerChat({ variables: { input: promptInput } });
  }, []);

  const commitChangesAgent = useCallback(async (input: ChatInputType) => {
    console.log('commitChangesAgent called with input:', input);
    const prompt = commitChangesPrompt(input.message);
    const promptInput: ChatInputType = {
      chatId: input.chatId,
      message: prompt,
      model: input.model,
      role: 'assistant',
    };
    console.log('Prompt Input:', promptInput);
    setTaskStep('commit');
    setStreamStatus(StreamStatus.STREAMING);
    setSubscription({
      enabled: true,
      variables: { input: promptInput },
    });
    await new Promise((resolve) => setTimeout(resolve, 100));
    await triggerChat({ variables: { input: promptInput } });
  }, []);

  return {
    loadingSubmit,
    handleSubmit,
    handleInputChange,
    stop,
    isStreaming: streamStatus === StreamStatus.STREAMING,
    currentChatId,
  };
}
