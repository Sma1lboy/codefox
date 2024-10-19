import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { RegisterUserInput } from './dto/register-user.input';
import { User } from './user.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { compare, hash } from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { LoginUserInput } from './dto/lgoin-user.input';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async registerUser(registerUserInput: RegisterUserInput): Promise<User> {
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

    return { access_token };
  }
}
