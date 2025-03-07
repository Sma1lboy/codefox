import { Injectable } from '@nestjs/common';
import { User } from './user.model';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { FileUpload } from 'graphql-upload-minimal';
import { UploadService } from '../upload/upload.service';
import { validateAndBufferFile } from 'src/common/security/file_check';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly uploadService: UploadService,
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

  async getUser(id: string): Promise<User> | null {
    return await this.userRepository.findOneBy({
      id,
    });
  }

  /**
   * Updates the user's avatar
   * @param userId User ID
   * @param file File upload
   * @returns Updated user object
   */
  async updateAvatar(userId: string, file: Promise<FileUpload>): Promise<User> {
    // Get the user
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    // Validate and convert file to buffer
    const uploadedFile = await file;
    const { buffer, mimetype } = await validateAndBufferFile(uploadedFile);

    // Upload the validated buffer to storage
    const result = await this.uploadService.upload(buffer, mimetype, 'avatars');

    // Update the user's avatar URL
    user.avatarUrl = result.url;
    return this.userRepository.save(user);
  }
}
