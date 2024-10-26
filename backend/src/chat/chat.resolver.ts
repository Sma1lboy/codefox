import { Resolver, Subscription, Args, Query, Mutation } from '@nestjs/graphql';
import { ChatCompletionChunk } from './chat.model';
import { ChatProxyService, ChatService } from './chat.service';
import { UserService } from 'src/user/user.service';
import { Chat } from './chat.model';
import { Message, Role } from 'src/chat/message.model';
import {
  NewChatInput,
  UpateChatTitleInput,
  ChatInput,
} from 'src/chat/dto/chat.input';
import { UseGuards } from '@nestjs/common';
import { ChatGuard } from '../guard/chat.guard';
import { GetUserIdFromToken } from '../decorator/get-auth-token';

@Resolver('Chat')
export class ChatResolver {
  constructor(
    private chatProxyService: ChatProxyService,
    private chatService: ChatService,
    private userService: UserService,
  ) {}

  @Subscription(() => ChatCompletionChunk, {
    nullable: true,
    resolve: (value) => value,
  })
  async *chatStream(@Args('input') input: ChatInput) {
    const iterator = this.chatProxyService.streamChat(input.message);
    this.chatService.saveMessage(input.chatId, null, input.message, Role.User);
    try {
      for await (const chunk of iterator) {
        if (chunk) {
          await this.chatService.saveMessage(
            input.chatId,
            chunk.id,
            chunk.choices[0].delta.content,
            Role.Model,
          );
          yield chunk;
        }
      }
    } catch (error) {
      console.error('Error in chatStream:', error);
      throw new Error('Chat stream failed');
    }
  }

  @Query(() => [Chat], { nullable: true })
  async getUserChats(@GetUserIdFromToken() userId: string): Promise<Chat[]> {
    const user = await this.userService.getUserChats(userId);
    return user ? user.chats : []; // Return chats if user exists, otherwise return an empty array
  }

  @Query(() => Message, { nullable: true })
  async getMessageDetail(
    @GetUserIdFromToken() userId: string,
    @Args('messageId') messageId: string,
  ): Promise<Message> {
    return this.chatService.getMessageById(messageId);
  }

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

  // @Query(() => [Message])
  // getAvailableModelTags(@Args('chatId') chatId: string): Message[] {
  //   return this.chatService.getChatHistory(chatId);
  // }

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
    @Args('upateChatTitleInput') upateChatTitleInput: UpateChatTitleInput,
  ): Promise<Chat> {
    return this.chatService.updateChatTitle(upateChatTitleInput);
  }
}
