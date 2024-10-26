import { Resolver, Subscription, Args, Query, Mutation } from '@nestjs/graphql';
import { ChatCompletionChunk } from './chat.model';
import { ChatProxyService, ChatService } from './chat.service';
import { Chat } from './chat.model';
import { Message } from 'src/chat/message.model';
import {
  NewChatInput,
  UpateChatTitleInput,
  ChatInput,
} from 'src/chat/dto/chat.input';

@Resolver('Chat')
export class ChatResolver {
  constructor(
    private chatProxyService: ChatProxyService,
    private chatService: ChatService,
  ) {}

  @Subscription(() => ChatCompletionChunk, {
    nullable: true,
    resolve: (value) => value,
  })
  async *chatStream(@Args('input') input: ChatInput) {
    const iterator = this.chatProxyService.streamChat(input.message);
    try {
      for await (const chunk of iterator) {
        if (chunk) {
          await this.chatService.saveMessage(
            input.id,
            chunk.choices[0].delta.content,
          );
          yield chunk;
        }
      }
    } catch (error) {
      console.error('Error in chatStream:', error);
      throw new Error('Chat stream failed');
    }
  }

  @Query(() => [Message])
  async getChatHistory(@Args('chatId') chatId: string): Promise<Message[]> {
    return this.chatService.getChatHistory(chatId);
  }

  @Query(() => Chat, { nullable: true })
  async getChatDetails(@Args('chatId') chatId: string): Promise<Chat> {
    return this.chatService.getChatDetails(chatId);
  }

  // @Query(() => [Message])
  // getModelTags(@Args('chatId') chatId: string): Message[] {
  //   return this.chatService.getChatHistory(chatId);
  // }

  @Mutation(() => Chat)
  async createChat(
    @Args('newChatInput') newChatInput: NewChatInput,
  ): Promise<Chat> {
    return this.chatService.createChat(newChatInput);
  }

  @Mutation(() => Boolean)
  async deleteChat(@Args('chatId') chatId: string): Promise<boolean> {
    return this.chatService.deleteChat(chatId);
  }

  @Mutation(() => Boolean)
  async clearChatHistory(@Args('chatId') chatId: string): Promise<boolean> {
    return this.chatService.clearChatHistory(chatId);
  }

  @Mutation(() => Chat, { nullable: true })
  async updateChatTitle(
    @Args('upateChatTitleInput') upateChatTitleInput: UpateChatTitleInput,
  ): Promise<Chat> {
    return this.chatService.updateChatTitle(upateChatTitleInput);
  }
}
