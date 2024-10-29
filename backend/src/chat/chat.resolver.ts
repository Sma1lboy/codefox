import {
  Resolver,
  Subscription,
  Args,
  Field,
  ObjectType,
  Query,
} from '@nestjs/graphql';
import { ChatCompletionChunk } from './chat.model';
import { ChatProxyService, ChatService } from './chat.service';
import { UserService } from 'src/user/user.service';
import { MessageRole } from './message.model';
import { ChatInput } from './dto/chat.input';

@Resolver('Chat')
export class ChatResolver {
  constructor(
    private chatProxyService: ChatProxyService,
    private chatService: ChatService,
    private userService: UserService,
  ) {}

  // this guard is not easy to test in /graphql
  // @UseGuards(ChatSubscriptionGuard)
  @Subscription(() => ChatCompletionChunk, {
    nullable: true,
    resolve: (value) => value,
  })
  async *chatStream(@Args('input') input: ChatInput) {
    const iterator = this.chatProxyService.streamChat(input.message);
    this.chatService.saveMessage(input.chatId, input.message, MessageRole.User);

    let accumulatedContent = ''; // Accumulator for all chunks

    try {
      for await (const chunk of iterator) {
        if (chunk) {
          accumulatedContent += chunk.choices[0].delta.content; // Accumulate content
          yield chunk; // Send each chunk
        }
      }

      // After all chunks are received, save the complete response as a single message
      await this.chatService.saveMessage(
        input.chatId,
        accumulatedContent,
        MessageRole.Model,
      );
    } catch (error) {
      console.error('Error in chatStream:', error);
      throw new Error('Chat stream failed');
    }
  }
}
