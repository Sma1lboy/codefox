import { Injectable, Logger } from '@nestjs/common';
import { Message, MessageRole } from 'src/chat/message.model';
import { OpenAIModelProvider } from 'src/common/model-provider/openai-model-provider';

@Injectable()
export class PromptToolService {
  private readonly logger = new Logger(PromptToolService.name);
  private readonly model = OpenAIModelProvider.getInstance();

  async regenerateDescription(description: string): Promise<string> {
    try {
      const response = await this.model.chatSync({
        messages: [
          {
            role: MessageRole.System,
            content: `You help users expand their project descriptions by rewriting them from a first-person perspective.
Format requirements:
1. Always start with "I want to..."
2. Write as if the user is speaking
3. Add 1-2 relevant details while maintaining the original idea
4. Keep it conversational and natural
5. Maximum 2-3 sentences
6. Never add features that weren't implied in the original description
Example:
Input: "create a todo app"
Output: "I want to create a todo app where I can keep track of my daily tasks. I think it would be helpful if I could organize them by priority and due dates."`,
          },
          {
            role: MessageRole.User,
            content: description,
          },
        ],
      });

      this.logger.debug('Enhanced description generated');
      return response;
    } catch (error) {
      this.logger.error(
        `Error generating enhanced description: ${error.message}`,
      );
      throw new Error('Failed to enhance project description');
    }
  }
}
