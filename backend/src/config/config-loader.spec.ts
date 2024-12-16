// config-loader.ts
import * as fs from 'fs';
import * as path from 'path';
import * as _ from 'lodash';
import { getConfigPath } from './common-path';

export interface ChatConfig {
  model: string;
  endpoint?: string;
  token?: string;
  default?: boolean;
  task?: string;
}

export interface EmbeddingConfig {
  model: string;
  endpoint?: string;
  token?: string;
}

export interface AppConfig {
  chats?: ChatConfig[];
  embeddings?: EmbeddingConfig;
}

export const exampleConfigContent = `{
  // Chat models configuration
  // You can configure multiple chat models
  "chats": [
    // Example of OpenAI GPT configuration
    {
      "model": "gpt-3.5-turbo",
      "endpoint": "https://api.openai.com/v1",
      "token": "your-openai-token",  // Replace with your OpenAI token
      "default": true                // Set as default chat model
    },
    
    // Example of local model configuration
    {
      "model": "llama2",
      "endpoint": "http://localhost:11434/v1",
      "task": "chat"
    }
  ],

  // Embedding model configuration (optional)
  "embeddings": {
    "model": "text-embedding-ada-002",
    "endpoint": "https://api.openai.com/v1",
    "token": "your-openai-token"     // Replace with your OpenAI token
  }
}`;

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: AppConfig;
  private readonly configPath: string;

  private constructor(configPath?: string) {
    this.configPath = configPath || getConfigPath('config');
    this.loadConfig();
  }

  public static getInstance(configPath?: string): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader(configPath);
    }
    return ConfigLoader.instance;
  }

  public static initConfigFile(configPath: string): void {
    if (fs.existsSync(configPath)) {
      throw new Error('Config file already exists');
    }

    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(configPath, exampleConfigContent, 'utf-8');
  }

  public reload(): void {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      const file = fs.readFileSync(this.configPath, 'utf-8');
      const jsonContent = file.replace(
        /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
        (m, g) => (g ? '' : m),
      );
      this.config = JSON.parse(jsonContent);
      this.validateConfig();
    } catch (error) {
      if (
        error.code === 'ENOENT' ||
        error.message.includes('Unexpected end of JSON input')
      ) {
        this.config = {};
        this.saveConfig();
      } else {
        throw error;
      }
    }
  }

  get<T>(path?: string): T {
    if (!path) {
      return this.config as unknown as T;
    }
    return _.get(this.config, path) as T;
  }

  set(path: string, value: any) {
    _.set(this.config, path, value);
    this.saveConfig();
  }

  private saveConfig() {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.config, null, 2),
      'utf-8',
    );
  }

  getAllChatConfigs(): ChatConfig[] {
    return this.config.chats || [];
  }

  getChatConfig(modelName?: string): ChatConfig | null {
    if (!this.config.chats || !Array.isArray(this.config.chats)) {
      return null;
    }

    const chats = this.config.chats;

    if (modelName) {
      const foundChat = chats.find((chat) => chat.model === modelName);
      if (foundChat) {
        return foundChat;
      }
    }

    return (
      chats.find((chat) => chat.default) || (chats.length > 0 ? chats[0] : null)
    );
  }

  addChatConfig(config: ChatConfig) {
    if (!this.config.chats) {
      this.config.chats = [];
    }

    const index = this.config.chats.findIndex(
      (chat) => chat.model === config.model,
    );
    if (index !== -1) {
      this.config.chats.splice(index, 1);
    }

    if (config.default) {
      this.config.chats.forEach((chat) => {
        chat.default = false;
      });
    }

    this.config.chats.push(config);
    this.saveConfig();
  }

  removeChatConfig(modelName: string): boolean {
    if (!this.config.chats) {
      return false;
    }

    const initialLength = this.config.chats.length;
    this.config.chats = this.config.chats.filter(
      (chat) => chat.model !== modelName,
    );

    if (this.config.chats.length !== initialLength) {
      this.saveConfig();
      return true;
    }

    return false;
  }

  getEmbeddingConfig(): EmbeddingConfig | null {
    return this.config.embeddings || null;
  }

  validateConfig() {
    if (!this.config) {
      this.config = {};
    }

    if (typeof this.config !== 'object') {
      throw new Error('Invalid configuration: Must be an object');
    }

    if (this.config.chats) {
      if (!Array.isArray(this.config.chats)) {
        throw new Error("Invalid configuration: 'chats' must be an array");
      }

      this.config.chats.forEach((chat, index) => {
        if (!chat.model) {
          throw new Error(
            `Invalid chat configuration at index ${index}: 'model' is required`,
          );
        }
      });

      const defaultChats = this.config.chats.filter((chat) => chat.default);
      if (defaultChats.length > 1) {
        throw new Error(
          'Invalid configuration: Multiple default chat configurations found',
        );
      }
    }

    if (this.config.embeddings) {
      if (!this.config.embeddings.model) {
        throw new Error("Invalid embedding configuration: 'model' is required");
      }
    }
  }
}
