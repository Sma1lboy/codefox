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
  chats?: Record<string, ChatConfig>;
  embeddings?: EmbeddingConfig;
}

export const exampleConfigContent = `{
  // Chat models configuration
  // You can configure multiple chat models
  "chats": {
    // Example of OpenAI GPT configuration
    "gpt": {
      "model": "gpt-3.5-turbo",
      "endpoint": "https://api.openai.com/v1",
      "token": "your-openai-token",  // Replace with your OpenAI token
      "default": true                // Set as default chat model
    },
    
    // Example of local model configuration
    "local-model": {
      "model": "llama2",
      "endpoint": "http://localhost:11434/v1",
      "task": "chat"
    }
  },

  // Embedding model configuration (optional)
  // Used for text embeddings and similarity search
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

  getChatConfig(chatId?: string): ChatConfig | null {
    if (!this.config.chats) {
      return null;
    }

    const chats = this.config.chats;
    if (chatId && chats[chatId]) {
      return chats[chatId];
    }

    const defaultChat =
      Object.values(chats).find((chat) => chat.default) ||
      Object.values(chats)[0];
    return defaultChat || null;
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
      if (typeof this.config.chats !== 'object') {
        throw new Error("Invalid configuration: 'chats' must be an object");
      }

      Object.entries(this.config.chats).forEach(([key, chat]) => {
        if (!chat.model) {
          throw new Error(
            `Invalid chat configuration for '${key}': 'model' is required`,
          );
        }
      });
    }

    if (this.config.embeddings) {
      if (!this.config.embeddings.model) {
        throw new Error("Invalid embedding configuration: 'model' is required");
      }
    }
  }
}
