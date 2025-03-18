import { ChatInputType } from '@/graphql/type';

/**
 * Helper function to save thinking process from AI response
 */
const saveThinkingProcess = async (
  result: any,
  input: ChatInputType,
  context: AgentContext
) => {
  if (result.thinking_process) {
    // Accumulate for final save
    context.accumulatedThoughts.push(result.thinking_process);

    // Break text into chunks for typewriter effect
    const breakText = (text: string) => {
      return text.match(/(\S{1,3}|\s+)/g) || [];
    };

    // Display with typewriter effect
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

              if (
                lastMsg?.role === 'assistant' &&
                lastMsg.id === input.chatId
              ) {
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

    // Apply typewriter effect for immediate display
    const brokenText = breakText(result.thinking_process);
    await typewriterEffect(brokenText, 10);
  }
};
import { toast } from 'sonner';
import {
  taskPrompt,
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

/**
 * Get the corresponding prompt based on the task type.
 */
function getPromptByTaskType(
  task_type: TaskType,
  message: string,
  fileStructure: string[]
): string {
  switch (task_type) {
    case TaskType.DEBUG:
      return findbugPrompt(message, fileStructure);
    case TaskType.REFACTOR:
      return refactorPrompt(message, fileStructure);
    case TaskType.OPTIMIZE:
      return optimizePrompt(message, fileStructure);
    default:
      throw new Error(`Unsupported task type: ${task_type}`);
  }
}

/**
 * Task analysis tool:
 * Analyzes requirements and identifies relevant files.
 */
export async function taskTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  console.log('taskTool called with input:', input);

  // Select the appropriate prompt based on the task type from the context.
  const prompt = getPromptByTaskType(
    context.task_type,
    input.message,
    context.fileStructure
  );

  console.log(context.task_type);

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
  await saveThinkingProcess(result, input, context);

  if (!result.files || !Array.isArray(result.files)) {
    throw new Error('Invalid response format: missing files array');
  }

  // Validate and filter file paths
  const validFiles = result.files.filter(
    (path) => !!path && typeof path === 'string'
  );
  if (validFiles.length === 0) {
    throw new Error('No valid files identified in the response');
  }

  context.requiredFiles = validFiles;
  console.log('Valid files to process:', validFiles);

  // Set next step to read file content
  context.currentStep = {
    tool: 'readFileTool',
    status: 'pending',
    description: `Read ${result.files.length} identified files`,
  };
  console.log('Task analysis completed, files identified:', result.files);
}

/**
 * Read file tool:
 * Reads the content of identified files.
 */
export async function readFileTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  console.log('readFileTool called with input:', input);

  if (!context.requiredFiles || context.requiredFiles.length === 0) {
    throw new Error(
      'No files specified to read. Make sure requiredFiles is set.'
    );
  }

  // Read file content for each required file
  console.log('Reading files:', context.requiredFiles);
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
        console.error(`Error reading file ${filePath}:`, error);
        throw error;
      }
    })
  );

  console.log('Files read:', context.requiredFiles);
  console.log('File contents loaded:', context.fileContents);
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
  console.log('editFileTool called with input:', input);
  console.log('Current file contents:', context.fileContents);

  if (Object.keys(context.fileContents).length === 0) {
    throw new Error(
      'No file contents available. Make sure readFileTool was called first.'
    );
  }

  // Generate edit prompt
  const prompt = editFilePrompt(input.message, context.fileContents);
  console.log('Generated prompt with file contents for editing');

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
  await saveThinkingProcess(result, input, context);

  // Check for files that need to be read or modified
  if (result.files && Array.isArray(result.files)) {
    context.requiredFiles = result.files;
    console.log('New files identified:', result.files);
  }

  if (!result.modified_files || typeof result.modified_files !== 'object') {
    throw new Error('Invalid response format: missing modified_files object');
  }

  // Update required files and content in context
  const modifiedPaths = Object.keys(result.modified_files);
  const validPaths = modifiedPaths.filter((path) => !!path);
  console.log('Adding new paths to required files:', validPaths);
  context.requiredFiles = Array.from(
    new Set([...context.requiredFiles, ...validPaths])
  );

  // Update file content in context
  Object.entries(result.modified_files).forEach(([filePath, content]) => {
    context.modifiedFiles[filePath] = content as string;
    context.fileContents[filePath] = content as string;
  });

  console.log('Updated context with modified files');
}

/**
 * Apply changes tool:
 * Confirms and applies file modifications.
 */
export async function applyChangesTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  console.log('applyChangesTool called with input:', input);

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

  console.log('Updated context with confirmed changes');
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
  console.log('codeReviewTool called with input:', input);

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
  await saveThinkingProcess(result, input, context);

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

  console.log('Code review completed');
}

/**
 * Commit changes tool:
 * Generates commit messages.
 */
export async function commitChangesTool(
  input: ChatInputType,
  context: AgentContext
): Promise<void> {
  console.log('commitChangesTool called with input:', input);

  // Generate commit message prompt
  const formattedChanges = Object.entries(context.modifiedFiles)
    .map(([filePath, content]) => `Modified file: ${filePath}`)
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
  await saveThinkingProcess(result, input, context);

  if (!result.commit_message) {
    throw new Error('Invalid response format: missing commit message');
  }

  context.commitMessage = result.commit_message;
  console.log('Generated commit message:', result.commit_message);
}
