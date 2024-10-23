import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { AuthResolver } from './auth.resolver';
import { JwtCacheService } from './jwt-cache.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/user/user.model';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { hash, compare } from 'bcrypt';

// 简化的 mockDb 实现
const mockDb = {
  run: jest.fn().mockImplementation((query, params, callback) => {
    if (callback) callback(null);
  }),
  get: jest.fn().mockImplementation((query, params, callback) => {
    if (callback) callback(null, { token: 'test.token' });
  }),
  close: jest.fn().mockImplementation((callback) => {
    if (callback) callback(null);
  }),
};

jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => mockDb),
}));

describe('Auth Module Tests', () => {
  let authService: AuthService;
  let authResolver: AuthResolver;
  let jwtCacheService: JwtCacheService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockUser = {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    password: 'hashedpassword',
    roles: [],
  };

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        AuthResolver,
        JwtCacheService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    authResolver = module.get<AuthResolver>(AuthResolver);
    jwtCacheService = module.get<JwtCacheService>(JwtCacheService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    jest.clearAllMocks();
  });

  describe('AuthService', () => {
    describe('register', () => {
      it('should successfully register a new user', async () => {
        const registerInput = {
          username: 'newuser',
          email: 'newuser@example.com',
          password: 'password123',
        };

        const hashedPassword = await hash(registerInput.password, 10);

        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockReturnValue({
          ...registerInput,
          password: hashedPassword,
        });
        mockUserRepository.save.mockResolvedValue({
          ...registerInput,
          id: '1',
          password: hashedPassword,
        });

        const result = await authService.register(registerInput);

        expect(result).toBeDefined();
        expect(result.username).toBe(registerInput.username);
        expect(result.email).toBe(registerInput.email);
        expect(
          await compare(registerInput.password, result.password),
        ).toBeTruthy();
      });

      it('should throw ConflictException if username already exists', async () => {
        const registerInput = {
          username: 'existinguser',
          email: 'new@example.com',
          password: 'password123',
        };

        mockUserRepository.findOne.mockResolvedValue(mockUser);

        await expect(authService.register(registerInput)).rejects.toThrow(
          ConflictException,
        );
      });
    });

    describe('login', () => {
      it('should successfully login and return access token', async () => {
        const loginInput = {
          username: 'testuser',
          password: 'correctpassword',
        };

        const hashedPassword = await hash('correctpassword', 10);
        mockUserRepository.findOne.mockResolvedValue({
          ...mockUser,
          password: hashedPassword,
        });

        const mockToken = 'mock.jwt.token';
        mockJwtService.sign.mockReturnValue(mockToken);

        const result = await authService.login(loginInput);

        expect(result).toBeDefined();
        expect(result.access_token).toBe(mockToken);
      });

      it('should throw UnauthorizedException for invalid credentials', async () => {
        const loginInput = {
          username: 'testuser',
          password: 'wrongpassword',
        };

        const hashedPassword = await hash('correctpassword', 10);
        mockUserRepository.findOne.mockResolvedValue({
          ...mockUser,
          password: hashedPassword,
        });

        await expect(authService.login(loginInput)).rejects.toThrow(
          UnauthorizedException,
        );
      });

      it('should throw UnauthorizedException for non-existent user', async () => {
        const loginInput = {
          username: 'nonexistentuser',
          password: 'password123',
        };

        mockUserRepository.findOne.mockResolvedValue(null);

        await expect(authService.login(loginInput)).rejects.toThrow(
          UnauthorizedException,
        );
      });
    });

    describe('validateToken', () => {
      it('should return true for valid token', async () => {
        const token = 'valid.jwt.token';

        mockJwtService.verifyAsync.mockResolvedValue({ userId: '1' });
        jest.spyOn(jwtCacheService, 'isTokenStored').mockResolvedValue(true);

        const result = await authService.validateToken({ token });

        expect(result).toBe(true);
        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token);
      });

      it('should return false for invalid token without logging error', async () => {
        const token = 'invalid.jwt.token';

        const jwtError = new Error('jwt expired');
        jwtError.name = 'JsonWebTokenError';
        mockJwtService.verifyAsync.mockRejectedValue(jwtError);

        const result = await authService.validateToken({ token });

        expect(result).toBe(false);
        expect(mockJwtService.verifyAsync).toHaveBeenCalledWith(token);
      });
    });

    describe('logout', () => {
      it('should successfully logout user', async () => {
        const token = 'valid.jwt.token';

        mockJwtService.verifyAsync.mockResolvedValue(true);
        jest.spyOn(jwtCacheService, 'isTokenStored').mockResolvedValue(true);
        jest.spyOn(jwtCacheService, 'removeToken').mockResolvedValue(undefined);

        const result = await authService.logout(token);

        expect(result).toBe(true);
        expect(jwtCacheService.removeToken).toHaveBeenCalledWith(token);
      });

      it('should return false for invalid token', async () => {
        const token = 'invalid.jwt.token';

        mockJwtService.verifyAsync.mockRejectedValue(
          new Error('Invalid token'),
        );

        const result = await authService.logout(token);

        expect(result).toBe(false);
      });
    });
  });

  describe('JwtCacheService', () => {
    let service: JwtCacheService;

    beforeEach(() => {
      service = new JwtCacheService();
    });

    it('should store token', (done) => {
      const token = 'test.token';

      service.storeToken(token).then(() => {
        expect(mockDb.run).toHaveBeenCalled();
        done();
      });
    });

    it('should check if token is stored', (done) => {
      const token = 'test.token';

      service.isTokenStored(token).then((result) => {
        expect(result).toBe(true);
        expect(mockDb.get).toHaveBeenCalled();
        done();
      });
    });

    it('should remove token', (done) => {
      const token = 'test.token';

      service.removeToken(token).then(() => {
        expect(mockDb.run).toHaveBeenCalled();
        done();
      });
    });
  });

  describe('AuthResolver', () => {
    describe('checkToken', () => {
      it('should return true for valid token', async () => {
        const input = { token: 'valid.jwt.token' };
        jest.spyOn(authService, 'validateToken').mockResolvedValue(true);

        const result = await authResolver.checkToken(input);

        expect(result).toBe(true);
        expect(authService.validateToken).toHaveBeenCalledWith(input);
      });

      it('should return false for invalid token', async () => {
        const input = { token: 'invalid.jwt.token' };
        jest.spyOn(authService, 'validateToken').mockResolvedValue(false);

        const result = await authResolver.checkToken(input);

        expect(result).toBe(false);
        expect(authService.validateToken).toHaveBeenCalledWith(input);
      });
    });
  });
});
