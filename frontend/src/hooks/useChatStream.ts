import { useState, useCallback } from 'react';
import { useMutation, useQuery, useSubscription } from '@apollo/client';
import {
  CHAT_STREAM,
  CREATE_CHAT,
  GET_CUR_PROJECT,
  TRIGGER_CHAT,
} from '@/graphql/request';
import { Message } from '@/const/MessageType';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  bugReasonPrompt,
  findbugPrompt,
  leaderPrompt,
  refactorPrompt,
  optimizePrompt,
  readFilePrompt,
  editFilePrompt,
  applyChangesPrompt,
  codeReviewPrompt,
  commitChangesPrompt,
} from './agentPrompt';
import { set } from 'react-hook-form';
import { debug } from 'console';
import { parseXmlToJson } from '@/utils/parser';
import { Project } from '@/graphql/type';
export enum StreamStatus {
  IDLE = 'IDLE',
  STREAMING = 'STREAMING',
  DONE = 'DONE',
}

export interface ChatInput {
  chatId: string;
  message: string;
  model: string;
  role?: string;
}

export interface SubscriptionState {
  enabled: boolean;
  variables: {
    input: ChatInput;
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
  const [currentChatId, setCurrentChatId] = useState<string>(chatId);
  const [cumulatedContent, setCumulatedContent] = useState<string>('');
  const [subscription, setSubscription] = useState<SubscriptionState>({
    enabled: false,
    variables: null,
  });
  const [taskDescription, setTaskDescription] = useState<string>('');
  const [taskStep, setTaskStep] = useState('');
  const [fileStructure, setFileStructure] = useState<string>('');
  const [fileContents, setFileContents] = useState<{ [key: string]: string }>(
    {}
  );
  const [originalFileContents, setOriginalFileContents] = useState<{
    [key: string]: string;
  }>({});

  const {
    data: projectData,
    loading: projectLoading,
    error: projectError,
  } = useQuery<{ getCurProject: Project }>(GET_CUR_PROJECT, {
    variables: { chatId: currentChatId },
    skip: !currentChatId,
  });

  const curProject = projectData?.getCurProject;
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
    onSubscriptionData: ({ subscriptionData }) => {
      const chatStream = subscriptionData?.data?.chatStream;
      if (!chatStream) return;

      if (streamStatus === StreamStatus.STREAMING && loadingSubmit) {
        setLoadingSubmit(false);
      }

      if (chatStream.status === StreamStatus.DONE) {
        setStreamStatus(StreamStatus.DONE);
        finishChatResponse();
        return;
      }

      const content = chatStream.choices?.[0]?.delta?.content;

      if (content) {
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];

          let filteredContent = content;

          if (filteredContent.includes('<jsonResponse>')) {
            setIsInsideJsonResponse(true);
            filteredContent = filteredContent.split('<jsonResponse>')[0];
          }

          if (isInsideJsonResponse) {
            if (filteredContent.includes('</jsonResponse>')) {
              setIsInsideJsonResponse(false);
              filteredContent =
                filteredContent.split('</jsonResponse>')[1] || '';
            } else {
              return prev;
            }
          }

          if (lastMsg?.role === 'assistant') {
            return [
              ...prev.slice(0, -1),
              { ...lastMsg, content: lastMsg.content + filteredContent },
            ];
          } else {
            return [
              ...prev,
              {
                id: chatStream.id,
                role: 'assistant',
                content: filteredContent,
                createdAt: new Date(chatStream.created * 1000).toISOString(),
              },
            ];
          }
        });
        setCumulatedContent((prev) => prev + content);
      }

      if (chatStream.choices?.[0]?.finishReason === 'stop') {
        setStreamStatus(StreamStatus.DONE);
        const parsedContent = parseXmlToJson(cumulatedContent);
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
        finishChatResponse();
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
      const input: ChatInput = {
        chatId: targetChatId,
        message: prompt,
        model: selectedModel,
      };
      console.log(input);

      setInput('');

      setTaskStep('task');
      setStreamStatus(StreamStatus.STREAMING);
      setSubscription({
        enabled: true,
        variables: { input },
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      await triggerChat({ variables: { input } });
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
    async (input: ChatInput) => {
      const res = parseXmlToJson(input.message);
      const assignedTask = res.task;
      const description = res.description;
      setTaskStep(assignedTask);
      setTaskDescription(description);
      let promptInput: ChatInput;
      let prompt: string;
      switch (assignedTask) {
        case 'debug':
        case 'refactor':
        case 'optimize':
          if (!curProject) {
            toast.error('Project not found');
            return;
          }
          if (!fileStructure) {
            const fetchedFileStructure = await fetch(
              `/api/filestructure?path=${curProject.projectPath}`,
              {
                method: 'GET',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
              }
            )
              .then((response) => response.json())
              .then((data) => {
                return data; // JSON data parsed by `data.json()` call
              });
            setFileStructure(fetchedFileStructure);
          }
          prompt =
            assignedTask === 'debug'
              ? findbugPrompt(description, fileStructure)
              : assignedTask === 'refactor'
                ? refactorPrompt(description, fileStructure)
                : optimizePrompt(description, fileStructure);
          promptInput = {
            chatId: input.chatId,
            message: prompt,
            model: input.model,
            role: 'assistant',
          };
          setTaskStep('read_file');
          await triggerChat({ variables: { promptInput } });
          break;
      }
    },
    [curProject, fileStructure]
  );

  const editFileAgent = useCallback(
    async (input: ChatInput) => {
      const filePaths = JSON.parse(input.message).files;
      const fileContentsPromises = filePaths.map(async (filePath: string) => {
        if (!fileContents[filePath]) {
          const fetchedFileContent = await fetch(`/api/file?path=${filePath}`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          })
            .then((response) => response.json())
            .then((data) => {
              return data.content; // JSON data parsed by `data.json()` call
            });
          setFileContents((prev) => ({
            ...prev,
            [filePath]: fetchedFileContent,
          }));
          setOriginalFileContents((prev) => ({
            ...prev,
            [filePath]: fetchedFileContent,
          }));
        }
        return fileContents[filePath];
      });

      const allFileContents = await Promise.all(fileContentsPromises);
      const prompt = editFilePrompt(
        taskDescription,
        allFileContents.join('\n')
      );
      const promptInput: ChatInput = {
        chatId: input.chatId,
        message: prompt,
        model: input.model,
        role: 'assistant',
      };
      setTaskStep('edit_file');
      await triggerChat({ variables: { promptInput } });
    },
    [fileContents, taskDescription]
  );

  const applyChangesAgent = useCallback(async (input: ChatInput) => {
    const changes = JSON.parse(input.message);
    const updatePromises = Object.keys(changes).map(async (filePath) => {
      const newContent = changes[filePath];
      await fetch('/api/file', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, newContent }),
      });
    });

    await Promise.all(updatePromises);
    setTaskStep('apply_changes');
    toast.success('Changes applied successfully');
    commitChangesAgent({
      chatId: input.chatId,
      message: JSON.stringify(changes),
      model: input.model,
      role: 'assistant',
    });
  }, []);

  const codeReviewAgent = useCallback(async (input: ChatInput) => {
    const prompt = codeReviewPrompt(input.message);
    const promptInput: ChatInput = {
      chatId: input.chatId,
      message: prompt,
      model: input.model,
      role: 'assistant',
    };
    setTaskStep('code_review');
    await triggerChat({ variables: { promptInput } });
  }, []);

  const commitChangesAgent = useCallback(async (input: ChatInput) => {
    const prompt = commitChangesPrompt(input.message);
    const promptInput: ChatInput = {
      chatId: input.chatId,
      message: prompt,
      model: input.model,
      role: 'assistant',
    };
    setTaskStep('commit');
    await triggerChat({ variables: { promptInput } });
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
