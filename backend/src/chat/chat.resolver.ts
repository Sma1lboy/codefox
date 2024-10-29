import { Resolver, Subscription, Args, Query, Mutation } from '@nestjs/graphql';
import { ChatCompletionChunk } from './chat.model';
import { ChatProxyService, ChatService } from './chat.service';
import { UserService } from 'src/user/user.service';
import { Chat } from './chat.model';
import { Message, MessageRole } from 'src/chat/message.model';
import {
  NewChatInput,
  UpdateChatTitleInput,
  ChatInput,
} from 'src/chat/dto/chat.input';
import { UseGuards } from '@nestjs/common';
import {
  ChatGuard,
  ChatSubscriptionGuard,
  MessageGuard,
} from '../guard/chat.guard';
import { GetUserIdFromToken } from '../decorator/get-auth-token';

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

  @Query(() => [String], { nullable: true })
  async getAvailableModelTags(
    @GetUserIdFromToken() userId: string,
  ): Promise<string[]> {
    try {
      const response = await this.chatProxyService.fetchModelTags();
      return response.models.data.map((model) => model.id); // Adjust based on model structure
    } catch (error) {
      throw new Error('Failed to fetch model tags');
    }
  }

  // this is not the final api.
  @Query(() => [Chat], { nullable: true })
  async getUserChats(@GetUserIdFromToken() userId: string): Promise<Chat[]> {
    const user = await this.userService.getUserChats(userId);
    return user ? user.chats : []; // Return chats if user exists, otherwise return an empty array
  }

  @UseGuards(MessageGuard)
  @Query(() => Message, { nullable: true })
  async getMessageDetail(
    @GetUserIdFromToken() userId: string,
    @Args('messageId') messageId: string,
  ): Promise<Message> {
    return this.chatService.getMessageById(messageId);
  }

  // To do: message need a update resolver

  @UseGuards(ChatGuard)
  @Query(() => [Message])
  async getChatHistory(@Args('chatId') chatId: string): Promise<Message[]> {
    return this.chatService.getChatHistory(chatId);
  }

  @UseGuards(ChatGuard)
  @Query(() => Chat, { nullable: true })
  async getChatDetails(@Args('chatId') chatId: string): Promise<Chat> {
    return this.chatService.getChatDetails(chatId);
  }

  @Mutation(() => Chat)
  async createChat(
    @GetUserIdFromToken() userId: string,
    @Args('newChatInput') newChatInput: NewChatInput,
  ): Promise<Chat> {
    return this.chatService.createChat(userId, newChatInput);
  }

  @UseGuards(ChatGuard)
  @Mutation(() => Boolean)
  async deleteChat(@Args('chatId') chatId: string): Promise<boolean> {
    return this.chatService.deleteChat(chatId);
  }

  @UseGuards(ChatGuard)
  @Mutation(() => Boolean)
  async clearChatHistory(@Args('chatId') chatId: string): Promise<boolean> {
    return this.chatService.clearChatHistory(chatId);
  }

  @UseGuards(ChatGuard)
  @Mutation(() => Chat, { nullable: true })
  async updateChatTitle(
    @Args('updateChatTitleInput') updateChatTitleInput: UpdateChatTitleInput,
  ): Promise<Chat> {
    return this.chatService.updateChatTitle(updateChatTitleInput);
  }
}
