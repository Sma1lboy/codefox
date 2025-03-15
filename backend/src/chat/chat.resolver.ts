import { Resolver, Args, Query, Mutation } from '@nestjs/graphql';
import { Chat } from './chat.model';
import { ChatProxyService, ChatService } from './chat.service';
import { UserService } from 'src/user/user.service';
import { Message, MessageRole } from './message.model';
import {
  ChatInput,
  NewChatInput,
  UpdateChatTitleInput,
} from './dto/chat.input';
import { GetUserIdFromToken } from 'src/decorator/get-auth-token.decorator';
import { Logger } from '@nestjs/common';
import { JWTAuth } from 'src/decorator/jwt-auth.decorator';

@Resolver('Chat')
export class ChatResolver {
  private readonly logger = new Logger('ChatResolver');

  constructor(
    private chatProxyService: ChatProxyService,
    private chatService: ChatService,
    private userService: UserService,
  ) {}

  @Mutation(() => String)
  @JWTAuth()
  async chat(@Args('input') input: ChatInput): Promise<string> {
    try {
      await this.chatService.saveMessage(
        input.chatId,
        input.message,
        MessageRole.User,
      );

      const response = await this.chatProxyService.chat(input);

      await this.chatService.saveMessage(
        input.chatId,
        response,
        MessageRole.Assistant,
      );

      return response;
    } catch (error) {
      this.logger.error('Error in chat:', error);
      throw error;
    }
  }

  @Query(() => [String], { nullable: true })
  async getAvailableModelTags(): Promise<string[]> {
    try {
      const response = await this.chatProxyService.fetchModelTags();
      this.logger.log('Loaded model tags:', response);
      return response;
    } catch (error) {
      throw new Error('Failed to fetch model tags');
    }
  }

  @Query(() => [Chat], { nullable: true })
  async getUserChats(@GetUserIdFromToken() userId: string): Promise<Chat[]> {
    const user = await this.userService.getUserChats(userId);

    return user ? user.chats : [];
  }
  // To do: message need a update resolver

  @JWTAuth()
  @Query(() => [Message])
  async getChatHistory(@Args('chatId') chatId: string): Promise<Message[]> {
    return this.chatService.getChatHistory(chatId);
  }

  @JWTAuth()
  @Query(() => Chat, { nullable: true })
  async getChatDetails(@Args('chatId') chatId: string): Promise<Chat> {
    return this.chatService.getChatDetails(chatId);
  }

  @Mutation(() => Chat)
  @JWTAuth()
  async createChat(
    @GetUserIdFromToken() userId: string,
    @Args('newChatInput') newChatInput: NewChatInput,
  ): Promise<Chat> {
    return this.chatService.createChat(userId, newChatInput);
  }

  @JWTAuth()
  @Mutation(() => Boolean)
  async deleteChat(@Args('chatId') chatId: string): Promise<boolean> {
    return this.chatService.deleteChat(chatId);
  }

  @JWTAuth()
  @Mutation(() => Boolean)
  async clearChatHistory(@Args('chatId') chatId: string): Promise<boolean> {
    return this.chatService.clearChatHistory(chatId);
  }

  @JWTAuth()
  @Mutation(() => Chat, { nullable: true })
  async updateChatTitle(
    @Args('updateChatTitleInput') updateChatTitleInput: UpdateChatTitleInput,
  ): Promise<Chat> {
    return this.chatService.updateChatTitle(updateChatTitleInput);
  }
}
