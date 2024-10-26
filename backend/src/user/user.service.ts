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
import { LoginUserInput } from './dto/login-user.input';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  // Method to get all chats of a user
  async getUserChats(userId: string): Promise<User> {
    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['chats'], // Ensure 'chats' relation is loaded
    });
  }
}
