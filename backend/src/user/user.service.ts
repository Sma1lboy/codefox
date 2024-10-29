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
  async getUserChats(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isDeleted: false },
      relations: ['chats'], // Load 'chats' relation, even though it's lazy
    });

    if (user) {
      // Resolve the lazy-loaded 'chats' relation and filter out soft-deleted chats
      const chats = await user.chats;
      user.chats = chats.filter((chat) => !chat.isDeleted);
    }

    return user;
  }
}
