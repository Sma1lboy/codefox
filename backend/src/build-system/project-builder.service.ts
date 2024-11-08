import { Injectable, Logger } from '@nestjs/common';
import { ChatProxyService } from 'src/chat/chat.service';
import { ModelProvider } from 'src/common/model-provider';

@Injectable()
export class ProjectBuilderService {
  private readonly logger = new Logger(ProjectBuilderService.name);

  private models: ModelProvider = ModelProvider.getInstance();
  constructor(private chatProxyService: ChatProxyService) {}

  async createProject(input: {
    name: string;
    projectDescription: string;
  }): Promise<void> {
    this.logger.log(`Creating project: ${input.name}`);
  }
}
