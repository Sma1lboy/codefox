import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './project.model';
import { ProjectPackages } from './project-packages.model';
import { ProjectService } from './project.service';
import { ProjectsResolver } from './project.resolver';
import { AuthModule } from '../auth/auth.module';
import { ProjectGuard } from '../guard/project.guard';
import { ChatService } from 'src/chat/chat.service';
import { User } from 'src/user/user.model';
import { Chat } from 'src/chat/chat.model';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Chat, User, ProjectPackages]),
    AuthModule, // Import AuthModule to provide JwtService to the ProjectGuard
  ],
  providers: [ChatService, ProjectService, ProjectsResolver, ProjectGuard],
  exports: [ProjectService, ProjectGuard],
})
export class ProjectModule {}
