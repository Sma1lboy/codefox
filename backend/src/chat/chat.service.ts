import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ChatCompletionChunk, Chat, StreamStatus } from './chat.model';
import { Message, MessageRole } from 'src/chat/message.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/user.model';
import {
  ChatInput,
  NewChatInput,
  UpdateChatTitleInput,
} from 'src/chat/dto/chat.input';
import { CustomAsyncIterableIterator } from 'src/common/model-provider/types';
import { ModelProvider } from 'src/common/model-provider';


@Injectable()
export class ChatProxyService {
  private readonly logger = new Logger('ChatProxyService');
  private models: ModelProvider;

  constructor(private httpService: HttpService) {
    this.models = ModelProvider.getInstance();
  }

  streamChat(
    input: ChatInput,
  ): CustomAsyncIterableIterator<ChatCompletionChunk> {
    return this.models.chat(input.message, input.model, input.chatId);
  }

  async fetchModelTags(): Promise<any> {
    return this.models.fetchModelsName();
  }
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
  ) {}

  async getChatHistory(chatId: string): Promise<Message[]> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, isDeleted: false },
      relations: ['messages'],
    });

    if (chat && chat.messages) {
      // Sort messages by createdAt in ascending order
      chat.messages = chat.messages
        .filter((message) => !message.isDeleted)
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    return chat ? chat.messages : [];
  }

  async getMessageById(messageId: string): Promise<Message> {
    return await this.messageRepository.findOne({
      where: { id: messageId, isDeleted: false },
    });
  }

  async getChatDetails(chatId: string): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, isDeleted: false },
      relations: ['messages'],
    });

    if (chat) {
      // Filter out messages that are soft-deleted
      chat.messages = chat.messages.filter((message) => !message.isDeleted);
    }

    return chat;
  }

  async createChat(userId: string, newChatInput: NewChatInput): Promise<Chat> {
    // Fetch the user entity using the userId
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Create a new chat and associate it with the user
    const newChat = this.chatRepository.create({
      title: newChatInput.title,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      user: user, // Associate the user with the chat
    });

    return await this.chatRepository.save(newChat);
  }

  async deleteChat(chatId: string): Promise<boolean> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, isDeleted: false },
      relations: ['messages'],
    });

    if (chat) {
      // Soft delete the chat
      chat.isDeleted = true;
      chat.isActive = false;
      await this.chatRepository.save(chat);

      // Soft delete all associated messages
      await this.messageRepository.update(
        { chat: { id: chatId }, isDeleted: false },
        { isDeleted: true, isActive: false },
      );

      return true;
    }
    return false;
  }

  async clearChatHistory(chatId: string): Promise<boolean> {
    const chat = await this.chatRepository.findOne({
      where: { id: chatId, isDeleted: false },
      relations: ['messages'],
    });
    if (chat) {
      await this.messageRepository.update(
        { chat: { id: chatId }, isDeleted: false },
        { isDeleted: true, isActive: false },
      );
      chat.updatedAt = new Date();
      await this.chatRepository.save(chat);
      return true;
    }
    return false;
  }

  async updateChatTitle(
    upateChatTitleInput: UpdateChatTitleInput,
  ): Promise<Chat> {
    const chat = await this.chatRepository.findOne({
      where: { id: upateChatTitleInput.chatId, isDeleted: false },
    });
    new Logger('chat').log('chat', chat);
    if (chat) {
      chat.title = upateChatTitleInput.title;
      chat.updatedAt = new Date();
      return await this.chatRepository.save(chat);
    }
    return null;
  }

  async saveMessage(
    chatId: string,
    messageContent: string,
    role: MessageRole,
  ): Promise<Message> {
    // Find the chat instance
    const chat = await this.chatRepository.findOne({ where: { id: chatId } });
    //if the chat id not exist, dont save this messages
    if (!chat) {
      return null;
    }

    // Create a new message associated with the chat
    const message = this.messageRepository.create({
      content: messageContent,
      role: role,
      chat,
      createdAt: new Date(),
    });

    // Save the message to the database
    return await this.messageRepository.save(message);
  }

  async getChatWithUser(chatId: string): Promise<Chat | null> {
    return this.chatRepository.findOne({
      where: { id: chatId, isDeleted: false },
      relations: ['user'], // Only load the user relation
    });
  }
}
