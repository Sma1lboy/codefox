import { Injectable, Logger } from '@nestjs/common';
import { ChatProxyService } from 'src/chat/chat.service';
import { OpenAIModelProvider } from 'src/common/model-provider/openai-model-provider';

@Injectable()
export class ProjectBuilderService {
  private readonly logger = new Logger(ProjectBuilderService.name);

  private models: OpenAIModelProvider = OpenAIModelProvider.getInstance();
  constructor(private chatProxyService: ChatProxyService) {}

  async createProject(input: {
    name: string;
    projectDescription: string;
  }): Promise<void> {
    this.logger.log(`Creating project: ${input.name}`);
  }
}
