import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatProxyService } from 'src/chat/chat.service';
import { ProjectBuilderService } from './project-builder.service';

@Module({
  imports: [HttpModule],
  providers: [ProjectBuilderService, ChatProxyService],
  exports: [ProjectBuilderService],
})
export class ProjectBuilderModule {}
