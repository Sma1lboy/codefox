// chat.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from '../chat.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Chat } from '../chat.model';
import { User } from 'src/user/user.model';
import { Message, MessageRole } from 'src/chat/message.model';
import { Repository } from 'typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserResolver } from 'src/user/user.resolver';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from 'src/user/user.service';
import { JwtService } from '@nestjs/jwt';
import { JwtCacheService } from 'src/auth/jwt-cache.service';
import { ConfigService } from '@nestjs/config';
import { Menu } from 'src/auth/menu/menu.model';
import { Role } from 'src/auth/role/role.model';
import { RegisterUserInput } from 'src/user/dto/register-user.input';
import { NewChatInput } from '../dto/chat.input';
import { ModelProvider} from 'src/common/model-provider';
import { HttpService } from '@nestjs/axios';
import { MessageInterface } from 'src/common/model-provider/types';

describe('ChatService', () => {
  let chatService: ChatService;
  let userResolver: UserResolver;
  let userService: UserService;
  let mockedChatService: jest.Mocked<Repository<Chat>>;
  let modelProvider: ModelProvider;
  let user: User;
  let userid='1';

  beforeAll(async()=>{
    const module: TestingModule = await Test.createTestingModule({
      imports:[
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: '../../database.sqlite',
          synchronize: true,
          entities: ['../../' + '/**/*.model{.ts,.js}'],
        }),
        TypeOrmModule.forFeature([Chat, User, Menu, Role]),
      ],
      providers: [
        Repository<Menu>,
        ChatService,
        AuthService,
        UserService,
        UserResolver,
        JwtService,
        JwtCacheService,
        ConfigService,
      ]
    }).compile();
    chatService = module.get(ChatService);
    userService = module.get(UserService);
    userResolver = module.get(UserResolver);
    
    modelProvider = ModelProvider.getInstance();
    mockedChatService = module.get(getRepositoryToken(Chat));
  })
  it('should excute curd in chat service', async() => {
    
    try{
      user = await userResolver.registerUser({
        username: 'testuser',
        password: 'securepassword',
        email: 'testuser@example.com',
      } as RegisterUserInput);
      userid = user.id;
    }catch(error){

    }
    const chat= await chatService.createChat(userid, {title: 'test'} as NewChatInput);
    let chatId = chat.id;
    console.log(await chatService.getChatHistory(chatId));
    
    console.log(await chatService.saveMessage(chatId, 'Hello, this is a test message.', MessageRole.User));
    console.log(await chatService.saveMessage(chatId, 'Hello, hello, im gpt.', MessageRole.Model));
    
    console.log(await chatService.saveMessage(chatId, 'write me the system prompt', MessageRole.User));

    let history = await chatService.getChatHistory(chatId);
    let messages = history.map((message) => {
      return {
        role: message.role,
        content: message.content
      } as MessageInterface;
    })
    console.log(history);
    console.log(
      await modelProvider.chatSync({
        model: 'gpt-4o',
        messages
      }));
  })
});