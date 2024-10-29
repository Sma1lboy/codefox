import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ChatCompletionChunk, Chat } from './chat.model';
import { Message, MessageRole } from 'src/chat/message.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/user.model';
import { NewChatInput, UpdateChatTitleInput } from 'src/chat/dto/chat.input';

type CustomAsyncIterableIterator<T> = AsyncIterator<T> & {
  [Symbol.asyncIterator](): AsyncIterableIterator<T>;
};

@Injectable()
export class ChatProxyService {
  private readonly logger = new Logger('ChatProxyService');

  constructor(private httpService: HttpService) {}

  streamChat(input: string): CustomAsyncIterableIterator<ChatCompletionChunk> {
    this.logger.debug('request chat input: ' + input);

    let isDone = false;
    let responseSubscription: any;
    const chunkQueue: ChatCompletionChunk[] = [];
    let resolveNextChunk:
      | ((value: IteratorResult<ChatCompletionChunk>) => void)
      | null = null;

    const iterator: CustomAsyncIterableIterator<ChatCompletionChunk> = {
      next: () => {
        return new Promise<IteratorResult<ChatCompletionChunk>>((resolve) => {
          if (chunkQueue.length > 0) {
            resolve({ done: false, value: chunkQueue.shift()! });
          } else if (isDone) {
            resolve({ done: true, value: undefined });
          } else {
            resolveNextChunk = resolve;
          }
        });
      },
      return: () => {
        isDone = true;
        if (responseSubscription) {
          responseSubscription.unsubscribe();
        }
        return Promise.resolve({ done: true, value: undefined });
      },
      throw: (error) => {
        isDone = true;
        if (responseSubscription) {
          responseSubscription.unsubscribe();
        }
        return Promise.reject(error);
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };

    responseSubscription = this.httpService
      .post(
        'http://localhost:3001/chat/completion',
        { content: input },
        { responseType: 'stream' },
      )
      .subscribe({
        next: (response) => {
          let buffer = '';
          response.data.on('data', (chunk: Buffer) => {
            buffer += chunk.toString();
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
              const line = buffer.slice(0, newlineIndex).trim();
              buffer = buffer.slice(newlineIndex + 1);
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6);
                if (jsonStr === '[DONE]') {
                  isDone = true;
                  if (resolveNextChunk) {
                    resolveNextChunk({ done: true, value: undefined });
                    resolveNextChunk = null;
                  }
                  return;
                }
                try {
                  const parsedChunk: ChatCompletionChunk = JSON.parse(jsonStr);
                  if (this.isValidChunk(parsedChunk)) {
                    if (resolveNextChunk) {
                      resolveNextChunk({ done: false, value: parsedChunk });
                      resolveNextChunk = null;
                    } else {
                      chunkQueue.push(parsedChunk);
                    }
                  } else {
                    this.logger.warn('Invalid chunk received:', parsedChunk);
                  }
                } catch (error) {
                  this.logger.error('Error parsing chunk:', error);
                }
              }
            }
          });
          response.data.on('end', () => {
            this.logger.debug('Stream ended');
            isDone = true;
            if (resolveNextChunk) {
              resolveNextChunk({ done: true, value: undefined });
              resolveNextChunk = null;
            }
          });
        },
        error: (error) => {
          this.logger.error('Error in stream:', error);
          if (resolveNextChunk) {
            resolveNextChunk({ done: true, value: undefined });
            resolveNextChunk = null;
          }
        },
      });

    return iterator;
  }

  async fetchModelTags(): Promise<any> {
    try {
      this.logger.debug('Requesting model tags from /tags endpoint.');

      // Make a GET request to /tags
      const response = await this.httpService
        .get('http://localhost:3001/tags', { responseType: 'json' })
        .toPromise();

      this.logger.debug('Model tags received:', response.data);
      return response.data;
    } catch (error) {
      this.logger.error('Error fetching model tags:', error);
      throw new Error('Failed to fetch model tags');
    }
  }

  private isValidChunk(chunk: any): chunk is ChatCompletionChunk {
    return (
      chunk &&
      typeof chunk.id === 'string' &&
      typeof chunk.object === 'string' &&
      typeof chunk.created === 'number' &&
      typeof chunk.model === 'string' &&
      Array.isArray(chunk.choices) &&
      chunk.choices.length > 0 &&
      typeof chunk.choices[0].index === 'number' &&
      chunk.choices[0].delta &&
      typeof chunk.choices[0].delta.content === 'string'
    );
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
    new Logger("chat").log('chat', chat);
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
