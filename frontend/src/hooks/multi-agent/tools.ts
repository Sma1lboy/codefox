import { toast } from 'sonner';
import {
  leaderPrompt,
  findbugPrompt,
  refactorPrompt,
  optimizePrompt,
  editFilePrompt,
  codeReviewPrompt,
  commitChangesPrompt,
  AgentContext,
  TaskType,
} from './agentPrompt';
import { startChatStream } from '@/api/ChatStreamAPI';
import { parseXmlToJson } from '@/utils/parser';
import { ChatInputType } from '@/graphql/type';

/**
 * Helper function to save and display a thinking process (or any provided text)
 * with a typewriter effect.
 *
 * Usage:
 *   await saveThinkingProcess("The thinking process text", input, context);
 *
 * This function stores the text in context.accumulatedThoughts and then gradually
 * displays it using a typewriter effect. After the entire text is shown, it appends
 * two newline characters.
 */
const saveThinkingProcess = async (
  thinkingText: string,
  input: ChatInputType,
  context: AgentContext
): Promise<void> => {
  if (!thinkingText) return;

  // Accumulate the thinking process text for historical record.
  context.accumulatedThoughts.push(thinkingText);

  // Function to break the text into small chunks for a smoother typewriter animation.
  const breakText = (text: string): string[] => {
    return text.match(/(\S{1,3}|\s+)/g) || [];
  };

  // Typewriter effect: gradually display the text chunks with a specified delay.
  const typewriterEffect = async (
    textArray: string[],
    delay: number
  ): Promise<void> => {
    return new Promise((resolve) => {
      let index = 0;

      const updateMessage = () => {
        if (index < textArray.length) {
          context.setMessages((prev) => {
            const lastMsg = prev[prev.length - 1];
            if (lastMsg?.role === 'assistant' && lastMsg.id === input.chatId) {
              return [
                ...prev.slice(0, -1),
                {
                  ...lastMsg,
                  content: lastMsg.content + textArray[index],
                },
              ];
            } else {
              return [
                ...prev,
                {
                  id: input.chatId,
                  role: 'assistant',
                  content: textArray[index],
                  createdAt: new Date().toISOString(),
                },
              ];
            }
          });

          index++;
          setTimeout(updateMessage, delay);
        } else {
          resolve();
        }
      };

      updateMessage();
    });
  };

  // Break the provided thinkingText into chunks and display them.
  const brokenText = breakText(thinkingText);
  await typewriterEffect(brokenText, 10);

  // After displaying all chunks, append two newlines to the final message.
  context.setMessages((prev) => {
    const lastMsg = prev[prev.length - 1];
    if (lastMsg?.role === 'assistant' && lastMsg.id === input.chatId) {
      return [
        ...prev.slice(0, -1),
        {
          ...lastMsg,
          content: lastMsg.content + '\n\n',
        },
      ];
    }
    return prev;
  });
};
/**
 * Get the corresponding prompt based on the task type.
 */
function getPromptByTaskType(
  task_type: TaskType | null,
  message: string,
  fileStructure: string[]
): string {
  // Validate inputs
  if (!task_type) {
    throw new Error('Task type is required');
  }
  if (!message || typeof message !== 'string') {
    throw new Error('Message is required and must be a string');
  }
  if (!Array.isArray(fileStructure)) {
    throw new Error('File structure must be an array');
  }

  // Handle task types
  switch (task_type) {
    case TaskType.DEBUG:
      return findbugPrompt(message, fileStructure);
    case TaskType.REFACTOR:
      return refactorPrompt(message, fileStructure);
    case TaskType.OPTIMIZE:
      return optimizePrompt(message, fileStructure);
    case TaskType.UNRELATED:
      throw new Error('Cannot generate prompt for unrelated tasks');
    default:
      throw new Error(`Unsupported task type: ${task_type}`);
  }
}

/**
 * Task analysis tool:
 * Analyzes requirements and identifies relevant files.
 */
export const taskTool = async (
  input: ChatInputType,
  context: AgentContext
): Promise<void> => {
  if (!input || !context) {
    throw new Error('Invalid input or context');
  }

  try {
    const prompt = leaderPrompt(input.message);

    // Get task analysis response
    const taskResponse = await startChatStream(
      {
        chatId: input.chatId,
        message: prompt,
        model: input.model,
        role: input.role,
      },
      context.token
    );

    // Parse task analysis response
    const result = parseXmlToJson(taskResponse);
    if (!result || typeof result !== 'object') {
      throw new Error('Invalid task analysis response format');
    }

    // Validate task type
    const taskType = result.task_type;
    if (!taskType || !Object.values(TaskType).includes(taskType)) {
      throw new Error(`Invalid task type: ${taskType || 'undefined'}`);
    }

    // Update context and display analysis
    context.task_type = taskType;
    await saveThinkingProcess(
      `Task Analysis: This is a ${taskType} task.\n${result.description || ''}`,
      input,
      context
    );

    // Handle unrelated tasks with early return
    if (taskType === TaskType.UNRELATED) {
      await saveThinkingProcess(
        "This question isn't related to code or development. Please ask coding-related questions.",
        input,
        context
      );
      return;
    }

    // Get and validate file analysis prompt
    const fileAnalysisPrompt = getPromptByTaskType(
      taskType,
      input.message,
      context.fileStructure
    );
    if (!fileAnalysisPrompt) {
      throw new Error(
        `Failed to generate analysis prompt for task type: ${taskType}`
      );
    }

    // Get file analysis from AI
    await saveThinkingProcess('Analyzing project files...', input, context);
    const fileResponse = await startChatStream(
      {
        chatId: input.chatId,
        message: fileAnalysisPrompt,
        model: input.model,
        role: input.role,
      },
      context.token
    );

    // Parse and validate file analysis response
    const fileResult = parseXmlToJson(fileResponse);
    if (!fileResult || typeof fileResult !== 'object') {
      throw new Error('Invalid file analysis response format');
    }

    // Validate and process identified files
    const files = fileResult.files;
    if (!Array.isArray(files)) {
      throw new Error('Invalid file analysis: missing files array');
    }

    // Filter and validate file paths
    const validFiles = files.filter(
      (path) => typeof path === 'string' && path.length > 0
    );
    if (validFiles.length === 0) {
      throw new Error('No valid files identified in the analysis');
    }

    // Show analysis results
    await saveThinkingProcess(
      `Found ${validFiles.length} relevant files:\n${validFiles.join('\n')}`,
      input,
      context
    );

    // Update context with next steps
    context.requiredFiles = validFiles;
    context.currentStep = {
      tool: 'readFileTool',
      status: 'pending',
      description: `Reading ${validFiles.length} identified files`,
    };
  } catch (error) {
    await saveThinkingProcess(
      `Error during task analysis: ${error.message}`,
      input,
      context
    );
    throw error;
  }
};

/**
 * Read file tool:
 * Reads the content of identified files.
 */
export async function readFileTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  if (!context.requiredFiles || context.requiredFiles.length === 0) {
    throw new Error(
      'No files specified to read. Make sure requiredFiles is set.'
    );
  }

  // Read file content for each required file
  await Promise.all(
    context.requiredFiles.map(async (filePath: string) => {
      try {
        const response = await fetch(
          `/api/file?path=${encodeURIComponent(`${context.projectPath}/${filePath}`)}`,
          {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        const data = await response.json();
        context.fileContents[filePath] = data.content;
      } catch (error) {
        toast.error(`Failed to read file: ${filePath}`);
        throw error;
      }
    })
  );

  toast.success(`${context.requiredFiles.length} files loaded successfully`);
}

/**
 * Edit file tool:
 * Modifies file content based on requirements.
 */
export async function editFileTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  if (Object.keys(context.fileContents).length === 0) {
    throw new Error(
      'No file contents available. Make sure readFileTool was called first.'
    );
  }

  // Generate edit prompt
  const prompt = editFilePrompt(input.message, context.fileContents);

  // Get AI response
  const response = await startChatStream(
    {
      chatId: input.chatId,
      message: prompt,
      model: input.model,
      role: input.role,
    },
    context.token
  );

  // Parse response using `parseXmlToJson`
  const result = parseXmlToJson(response);
  await saveThinkingProcess(
    `Analyzing file changes...\nFiles to modify: ${Object.keys(result.modified_files || {}).join(', ')}`,
    input,
    context
  );

  // Check for files that need to be read or modified
  if (result.files && Array.isArray(result.files)) {
    context.requiredFiles = result.files;
  }

  if (!result.modified_files || typeof result.modified_files !== 'object') {
    throw new Error('Invalid response format: missing modified_files object');
  }

  // Update required files and content in context
  const modifiedPaths = Object.keys(result.modified_files);
  const validPaths = modifiedPaths.filter((path) => !!path);
  context.requiredFiles = Array.from(
    new Set([...context.requiredFiles, ...validPaths])
  );

  // Update file content in context with typewriter effect
  for (const [filePath, content] of Object.entries(result.modified_files)) {
    // Set current file in code-engine
    context.setFilePath(filePath);
    await new Promise((resolve) => setTimeout(resolve, 500)); // Wait for file to load

    // Parse content if it's a JSON string
    let realContent = content as string;
    try {
      if (realContent.startsWith('"') && realContent.endsWith('"')) {
        realContent = JSON.parse(realContent);
      }
    } catch (error) {
      toast.error('Failed to parse file content');
      throw error;
    }

    const lines = realContent.split('\n');
    let accumulatedContent = '';

    if (context.editorRef?.current) {
      // Get current editor content as baseline
      accumulatedContent = context.editorRef.current.getValue();

      // Wait for file path change to take effect
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Show each line with animation
      try {
        for (let i = 0; i < lines.length; i++) {
          accumulatedContent = lines.slice(0, i + 1).join('\n');
          context.editorRef.current.setValue(accumulatedContent);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        toast.error('Failed to animate file content');
        throw error;
      }

      // Sync final content
      context.fileContents[filePath] = content as string;
    }

    // Store final unescaped content
    context.modifiedFiles[filePath] = realContent;
    context.fileContents[filePath] = realContent;
  }
}

/**
 * Apply changes tool:
 * Confirms and applies file modifications.
 */
export async function applyChangesTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  // Validate modification content
  Object.entries(context.modifiedFiles).forEach(([filePath, content]) => {
    if (!content || typeof content !== 'string') {
      throw new Error(`Invalid content for file: ${filePath}`);
    }
  });

  // Update file content in context
  Object.entries(context.modifiedFiles).forEach(([filePath, content]) => {
    context.fileContents[filePath] = content;
  });

  toast.success('Changes applied successfully');
}

/**
 * Code review tool:
 * Checks whether modifications meet the requirements.
 */
export async function codeReviewTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  // Generate review prompt
  const formattedMessage = Object.entries(context.modifiedFiles)
    .map(
      ([filePath, content]) =>
        `### File: ${filePath}\n\`\`\`\n${content}\n\`\`\``
    )
    .join('\n\n');

  const prompt = codeReviewPrompt(formattedMessage);

  // Get AI response
  const response = await startChatStream(
    {
      chatId: input.chatId,
      message: prompt,
      model: input.model,
      role: input.role,
    },
    context.token
  );

  // Parse review results using `parseXmlToJson`
  const result = parseXmlToJson(response);
  await saveThinkingProcess(
    `Code Review:\n${result.review_result}\n\nComments:\n${result.comments?.join('\n')}`,
    input,
    context
  );

  if (!result.review_result || !result.comments) {
    throw new Error('Invalid response format: missing review details');
  }

  // Update review results in context
  context.reviewComments = result.comments;
  if (result.review_result === 'Still has issues') {
    context.currentStep = {
      tool: 'editFileTool',
      status: 'pending',
      description: 'Address review comments',
    };
  }
}

/**
 * Commit changes tool:
 * Generates commit messages.
 */
export async function commitChangesTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  // Generate commit message prompt
  const formattedChanges = Object.entries(context.modifiedFiles)
    .map(([filePath, content]) => `Modified file: ${filePath}: ${content}`)
    .join('\n');

  const prompt = commitChangesPrompt(formattedChanges);

  // Get AI response
  const response = await startChatStream(
    {
      chatId: input.chatId,
      message: prompt,
      model: input.model,
      role: input.role,
    },
    context.token
  );

  // Parse commit message using `parseXmlToJson`
  const result = parseXmlToJson(response);
  await saveThinkingProcess(
    `Generated commit message:\n${result.commit_message}`,
    input,
    context
  );

  if (!result.commit_message) {
    throw new Error('Invalid response format: missing commit message');
  }

  context.commitMessage = result.commit_message;
}
