import {
  getLlama,
  LlamaChatSession,
  LlamaContext,
  LlamaModel,
} from 'node-llama-cpp';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ChatMessageInput } from './chat.input.ts';
import { ChatMessage } from './chat.model.ts';

@Injectable()
export class ChatService implements OnModuleInit {
  private model: LlamaModel;
  private context: LlamaContext;

  async onModuleInit() {
    await this.initializeModel();
  }

  private async initializeModel() {
    const llama = await getLlama();
    this.model = await llama.loadModel({
      modelPath:
        process.cwd() + 'models/LLAMA-3.2-1B-OpenHermes2.5.IQ4_XS.gguf',
    });
    this.context = await this.model.createContext();
  }

  async generateResponse(input: ChatMessageInput): Promise<ChatMessage> {
    const session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
      // promptWrapper: (prompt) => `${prompt.role}: ${prompt.content}`,
    });

    const response = await session.prompt(input.content);

    const chatResponse: ChatMessage = {
      role: 'bot',
      content: response,
    };

    return chatResponse;
  }
}
