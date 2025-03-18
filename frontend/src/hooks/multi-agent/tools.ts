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
  switch (task_type) {
    case TaskType.DEBUG:
      return findbugPrompt(message, fileStructure);
    case TaskType.REFACTOR:
      return refactorPrompt(message, fileStructure);
    case TaskType.OPTIMIZE:
      return optimizePrompt(message, fileStructure);
    case TaskType.UNRELATED:
      return;
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

  // First analyze the task
  const taskAnalysisPrompt = leaderPrompt(input.message);
  const taskResponse = await startChatStream(
    {
      chatId: input.chatId,
      message: taskAnalysisPrompt,
      model: input.model,
      role: input.role,
    },
    context.token
  );

  // Parse and validate task analysis response
  const taskResult = parseXmlToJson(taskResponse);
  // Display AI's task analysis with typewriter effect
  await saveThinkingProcess(
    `Task Analysis: This is a ${taskResult.task_type} task.\n${taskResult.description || ''}`,
    input,
    context
  );

  // Update task type based on analysis
  context.task_type = taskResult.task_type;

  // Handle unrelated tasks early
  if (taskResult.task_type === TaskType.UNRELATED) {
    // Display AI's task analysis with typewriter effect
    await saveThinkingProcess(
      "I apologize, but this question isn't related to code or the project. I'm a code assistant focused on helping with programming tasks.",
      input,
      context
    );
    return;
  }

  // For code-related tasks, get the specific prompt
  const prompt = getPromptByTaskType(
    taskResult.task_type,
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
  await saveThinkingProcess(result.thinking_process, input, context);

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
  await saveThinkingProcess(
    `Analyzing file changes...\nFiles to modify: ${Object.keys(result.modified_files || {}).join(', ')}`,
    input,
    context
  );

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
      console.error('Error parsing code content:', error);
    }

    console.log(`Starting line-by-line changes for ${filePath}`);
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
          console.log(`Updated line ${i + 1}/${lines.length} in ${filePath}`);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error('Error updating editor content:', error);
      }

      // Sync final content
      context.fileContents[filePath] = content as string;
    }

    // Store final unescaped content
    context.modifiedFiles[filePath] = realContent;
    context.fileContents[filePath] = realContent;
  }

  console.log('Updated files with line-by-line animation of changes');
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
