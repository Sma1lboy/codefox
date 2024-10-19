import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { compare, hash } from 'bcrypt';
import { LoginUserInput } from 'src/user/dto/lgoin-user.input';
import { RegisterUserInput } from 'src/user/dto/register-user.input';
import { User } from 'src/user/user.model';
import { Repository } from 'typeorm';
import { CheckTokenInput } from './dto/check-token.input';
import { JwtCacheService } from 'src/auth/jwt-cache.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private jwtCacheService: JwtCacheService,
    private configService: ConfigService,
  ) {}

  async register(registerUserInput: RegisterUserInput): Promise<User> {
    const { username, email, password } = registerUserInput;

    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    const hashedPassword = await hash(password, 10);
    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
    });

    return this.userRepository.save(newUser);
  }

  async login(
    loginUserInput: LoginUserInput,
  ): Promise<{ access_token: string }> {
    const { username, password } = loginUserInput;

    const user = await this.userRepository.findOne({
      where: [{ username: username }],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { userId: user.id, username: user.username };
    const access_token = this.jwtService.sign(payload);
    this.jwtCacheService.storeToken(access_token);

    return { access_token };
  }

  async validateToken(params: CheckTokenInput): Promise<boolean> {
    try {
      await this.jwtService.verifyAsync(params.token);
      return this.jwtCacheService.isTokenStored(params.token);
    } catch (error) {
      console.log(error);
      return false;
    }
  }
  async logout(token: string): Promise<Boolean> {
    Logger.log('logout token', token);
    try {
      await this.jwtService.verifyAsync(token);
    } catch (error) {
      return false;
    }

    if (!(await this.jwtCacheService.isTokenStored(token))) {
      return false;
    }
    this.jwtCacheService.removeToken(token);
    return true;
  }
}
