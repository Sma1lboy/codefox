import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../chat.service';
import { Chat } from '../chat.model';
import { User } from 'src/user/user.model';
import { MessageRole } from 'src/chat/message.model';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserResolver } from 'src/user/user.resolver';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { JwtCacheService } from 'src/auth/jwt-cache.service';
import { ConfigService } from '@nestjs/config';
import { Menu } from 'src/auth/menu/menu.model';
import { Role } from 'src/auth/role/role.model';

/**
 * Mock service for JWT cache operations
 * Provides mock implementations for cache management methods
 */
const mockJwtCacheService = {
  clearCache: jest.fn().mockResolvedValue(undefined),
  set: jest.fn().mockResolvedValue(undefined),
  get: jest.fn().mockResolvedValue(null),
  delete: jest.fn().mockResolvedValue(undefined),
};

/**
 * Mock implementation for ModelProvider
 * Simulates AI model response behavior for testing
 */
jest.mock('src/common/model-provider', () => ({
  ModelProvider: {
    getInstance: jest.fn().mockReturnValue({
      chatSync: jest.fn().mockResolvedValue({
        content: 'Mocked response',
      }),
    }),
  },
}));

/**
 * Integration tests for ChatService
 * Tests the complete workflow of chat operations including user creation,
 * message handling, and history retrieval
 */
describe('ChatService Integration', () => {
  let module: TestingModule;
  let chatService: ChatService;
  let userResolver: UserResolver;
  let user: User;

  /**
   * Setup test module and dependencies
   * Configures in-memory SQLite database and required services
   */
  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          entities: [Chat, User, Menu, Role],
          logging: false,
        }),
        TypeOrmModule.forFeature([Chat, User, Menu, Role]),
      ],
      providers: [
        ChatService,
        AuthService,
        UserService,
        UserResolver,
        JwtService,
        {
          provide: JwtCacheService,
          useValue: mockJwtCacheService, // Use mocked JWT cache service
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              const configs = {
                'jwt.secret': 'test-secret',
                'jwt.expiresIn': '1h',
              };
              return configs[key];
            }),
          },
        },
      ],
    }).compile();

    chatService = module.get<ChatService>(ChatService);
    userResolver = module.get<UserResolver>(UserResolver);
  });

  /**
   * Test complete chat workflow
   * Validates the entire process from user creation to message handling
   */
  it('should execute chat workflow', async () => {
    // Step 1: Create test user
    const userData = {
      username: 'testuser',
      password: 'securepassword',
      email: 'testuser@example.com',
    };

    user = await userResolver.registerUser(userData);
    expect(user).toBeDefined();
    expect(user.username).toBe(userData.username);

    // Step 2: Create new chat session
    const chat = await chatService.createChat(user.id, {
      title: 'test chat',
    });
    expect(chat).toBeDefined();
    expect(chat.title).toBe('test chat');

    // Step 3: Save user message
    const userMessage = await chatService.saveMessage(
      chat.id,
      'Hello, this is a test message.',
      MessageRole.User,
    );
    expect(userMessage).toBeDefined();

    // Step 4: Retrieve chat history
    const history = await chatService.getChatHistory(chat.id);
    expect(history).toBeDefined();
    expect(history).toHaveLength(1);
    expect(history[0].content).toBe('Hello, this is a test message.');

    // Step 5: Validate message format
    const messages = history.map((message) => ({
      role: message.role,
      content: message.content,
    }));
    expect(messages).toHaveLength(1);
    expect(messages[0].role).toBe(MessageRole.User);
  });

  /**
   * Cleanup after all tests
   * Ensures proper closure of database connections and resources
   */
  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });
});
