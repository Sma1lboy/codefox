import { ChatInputType } from '@/graphql/type';
import { startChatStream } from '@/api/ChatStreamAPI';
import { findToolNode } from './toolNodes';
import {
  taskPrompt,
  confirmationPrompt,
  AgentContext,
  TaskType,
} from './agentPrompt';
import path from 'path';
import { parseXmlToJson } from '@/utils/parser';
import { Message } from '@/const/MessageType';

/**
 * Normalize file paths.
 */
function normalizePath(filePath: string): string {
  return path.normalize(filePath).replace(/\\/g, '/');
}

/**
 * Validate and normalize file list.
 */
function validateFiles(files: string[]): string[] {
  return files.map((file) => {
    const normalized = normalizePath(file);
    if (!normalized || normalized.includes('..')) {
      throw new Error(`Invalid file path: ${file}`);
    }
    return normalized;
  });
}

/**
 * The Manager Agent is responsible for:
 * 1. Initializing the context.
 * 2. Letting AI determine each step of the process.
 * 3. Executing the tool selected by AI.
 * 4. Repeating until AI determines the task is complete.
 */
export async function managerAgent(
  input: ChatInputType,
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>,
  projectPath: string,
  saveMessage: any,
  token: string
): Promise<void> {
  console.log('managerAgent called with input:', input);

  try {
    // Initialize context
    const context: AgentContext = {
      task_type: TaskType.DEBUG, // Initial type, AI will update it later
      request: input.message, // Store the original request
      projectPath,
      fileStructure: [],
      fileContents: {},
      modifiedFiles: {},
      requiredFiles: [], // Initialize empty array for required files
      currentStep: {
        tool: undefined,
        status: 'initializing',
        description: 'Starting task analysis',
      },
      setMessages,
      saveMessage,
      token,
    };

    // Retrieve project file structure
    try {
      const response = await fetch(
        `/api/filestructure?path=${encodeURIComponent(projectPath)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const data = await response.json();
      context.fileStructure = validateFiles(data.res);
      console.log('Initialized file structure:', context.fileStructure);
    } catch (error) {
      console.error('Error fetching file structure:', error);
      throw error;
    }

    const MAX_ITERATIONS = 60;
    const TIMEOUT = 30 * 60 * 1000; // 30-minute timeout
    const startTime = Date.now();
    let iteration = 0;

    // Main loop: let AI determine each step
    while (iteration < MAX_ITERATIONS && Date.now() - startTime < TIMEOUT) {
      // Get AI's decision
      const confirmationPromptStr = confirmationPrompt(
        context.task_type,
        context
      );
      const response = await startChatStream(
        {
          chatId: input.chatId,
          message: confirmationPromptStr,
          model: input.model,
          role: `assistant-${context.task_type}`,
        },
        token
      );

      // Parse AI's response using `parseXmlToJson`
      let decision;
      try {
        decision = parseXmlToJson(response);
        console.log('Parsed AI Decision:', decision);
      } catch (error) {
        console.error('Error parsing AI response:', error);
        throw error;
      }

      // If task is complete, exit loop
      if (decision.completed) {
        break;
      }

      // Update the current step in context
      context.currentStep = {
        tool: decision.next_step.tool,
        status: 'executing',
        description: decision.next_step.description,
      };

      console.log('required Files:', decision.next_step.files);
      context.requiredFiles = [
        ...context.requiredFiles,
        ...decision.next_step.files.filter(
          (file) => !context.requiredFiles.includes(file)
        ),
      ];

      // Find and execute the tool
      const toolNode = findToolNode(decision.next_step.tool);
      if (!toolNode) {
        throw new Error(`Tool not found: ${decision.next_step.tool}`);
      }

      // Execute the tool
      const toolInput = {
        ...input,
        role: `assistant-${context.task_type}`,
        message: decision.next_step,
      };

      await toolNode.behavior(toolInput, context);

      // Update step status
      context.currentStep.status = 'completed';

      iteration++;
      console.log(`Task iteration ${iteration}/${MAX_ITERATIONS}`);
    }

    // Check if task exceeded limits
    if (iteration >= MAX_ITERATIONS) {
      throw new Error('Task exceeded maximum iterations');
    }
    if (Date.now() - startTime >= TIMEOUT) {
      throw new Error('Task timed out');
    }

    // Handle final file modifications
    if (Object.keys(context.modifiedFiles).length > 0) {
      await Promise.all(
        Object.entries(context.modifiedFiles).map(
          async ([filePath, content]) => {
            try {
              await fetch('/api/file', {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  filePath: normalizePath(`${context.projectPath}/${filePath}`),
                  newContent: content,
                }),
              });
              console.log(`File updated: ${filePath}`);
            } catch (error) {
              console.error(`Error updating file ${filePath}:`, error);
              throw error;
            }
          }
        )
      );
    }

    console.log('Task completed successfully');
  } catch (error) {
    console.error('Error in managerAgent:', error);
    throw error;
  }
}
