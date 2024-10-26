import { Test, TestingModule } from '@nestjs/testing';
import { UserResolver } from '../user.resolver';
import { AuthService } from 'src/auth/auth.service';
import { UserService } from '../user.service';
import { RegisterUserInput } from '../dto/register-user.input';
import { User } from '../user.model';
import { LoginUserInput } from '../dto/login-user.input';

describe('UserResolver', () => {
  let resolver: UserResolver;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserResolver,
        {
          provide: UserService,
          useValue: {
            findOneByUsername: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
          },
        },
      ],
    }).compile();

    resolver = module.get<UserResolver>(UserResolver);
    authService = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  describe('registerUser', () => {
    it('should successfully register a new user', async () => {
      // Arrange
      const registerInput: RegisterUserInput = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };
      const mockUser: User = {
        id: '1',
        ...registerInput,
        password: 'hashedPassword',
        roles: [],
        createdAt: undefined,
        isActive: false,
        isDeleted: false,
        updatedAt: undefined,
      };
      jest.spyOn(authService, 'register').mockResolvedValue(mockUser);

      // Act
      const result = await resolver.registerUser(registerInput);

      // Assert
      expect(result).toEqual(mockUser);
      expect(authService.register).toHaveBeenCalledWith(registerInput);
    });
  });

  describe('login', () => {
    it('should successfully login user', async () => {
      // Arrange
      const loginInput: LoginUserInput = {
        username: 'testuser',
        password: 'password123',
      };
      const mockResponse = { access_token: 'jwt-token' };
      jest.spyOn(authService, 'login').mockResolvedValue(mockResponse);

      // Act
      const result = await resolver.login(loginInput);

      // Assert
      expect(result).toEqual(mockResponse);
      expect(authService.login).toHaveBeenCalledWith(loginInput);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      // Arrange
      const token = 'valid-token';
      jest.spyOn(authService, 'logout').mockResolvedValue(true);

      // Act
      const result = await resolver.logout(token);

      // Assert
      expect(result).toBe(true);
      expect(authService.logout).toHaveBeenCalledWith(token);
    });
  });
});
