import * as fs from 'fs';
import * as _ from 'lodash';
import { getConfigPath } from './common-path';
import { Logger } from '@nestjs/common';
import * as path from 'path';

export interface ModelConfig {
  model: string;
  endpoint?: string;
  token?: string;
  default?: boolean;
}

export interface AppConfig {
  chat: ModelConfig[];
  embedding: ModelConfig[];
}

export const exampleConfigContent = `{
  "chat": [
    {
      "model": "gpt-4",                         
      "endpoint": "https://api.openai.com/v1",   
      "token": "your-openai-token",              
      "default": true                            
    },
    {
      "model": "llama2"                          
    }
  ],
  "embedding": [
    {
      "model": "text-embedding-ada-002",        
      "endpoint": "https://api.openai.com/v1",
      "token": "your-openai-token",
      "default": true
    }
  ]
}`;

export class ConfigLoader {
  readonly logger = new Logger(ConfigLoader.name);
  private static instance: ConfigLoader;
  private static config: AppConfig;
  private readonly configPath: string;

  private constructor() {
    this.configPath = getConfigPath();
    this.initConfigFile();
    this.loadConfig();
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  public initConfigFile(): void {
    this.logger.log('Initializing configuration file', 'ConfigLoader');

    if (fs.existsSync(this.configPath)) {
      return;
    }

    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    fs.writeFileSync(this.configPath, exampleConfigContent, 'utf-8');
    this.logger.log('Example configuration file created', 'ConfigLoader');
  }

  public reload(): void {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      this.logger.log(
        `Loading configuration from ${this.configPath}`,
        'ConfigLoader'
      );
      const file = fs.readFileSync(this.configPath, 'utf-8');
      const jsonContent = file;
      ConfigLoader.config = JSON.parse(jsonContent);

      if (!ConfigLoader.config.chat) {
        ConfigLoader.config.chat = [];
      }
      if (!ConfigLoader.config.embedding) {
        ConfigLoader.config.embedding = [];
      }

      this.validateConfig();
    } catch (error: any) {
      if (
        error.code === 'ENOENT' ||
        error.message.includes('Unexpected end of JSON input')
      ) {
        ConfigLoader.config = { chat: [], embedding: [] };
        this.saveConfig();
      } else {
        throw error;
      }
    }

    this.logger.log(ConfigLoader.config);
  }

  get<T>(path?: string): T {
    if (!path) {
      return ConfigLoader.config as unknown as T;
    }
    return _.get(ConfigLoader.config, path) as T;
  }

  set(path: string, value: any) {
    _.set(ConfigLoader.config, path, value);
    this.saveConfig();
  }

  private saveConfig() {
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(ConfigLoader.config, null, 2),
      'utf-8'
    );
  }

  // Chat model methods
  addChatModelConfig(config: ModelConfig) {
    const index = ConfigLoader.config.chat.findIndex(
      (m) => m.model === config.model
    );
    if (index !== -1) {
      ConfigLoader.config.chat.splice(index, 1);
    }

    if (config.default) {
      ConfigLoader.config.chat.forEach((m) => {
        m.default = false;
      });
    }

    ConfigLoader.config.chat.push(config);
    this.saveConfig();
  }

  removeChatModelConfig(modelName: string): boolean {
    const initialLength = ConfigLoader.config.chat.length;
    ConfigLoader.config.chat = ConfigLoader.config.chat.filter(
      (m) => m.model !== modelName
    );

    if (ConfigLoader.config.chat.length !== initialLength) {
      this.saveConfig();
      return true;
    }

    return false;
  }

  getAllChatModelConfigs(): ModelConfig[] {
    return ConfigLoader.config.chat;
  }

  // Embedding model methods
  addEmbeddingModelConfig(config: ModelConfig) {
    const index = ConfigLoader.config.embedding.findIndex(
      (m) => m.model === config.model
    );
    if (index !== -1) {
      ConfigLoader.config.embedding.splice(index, 1);
    }

    if (config.default) {
      ConfigLoader.config.embedding.forEach((m) => {
        m.default = false;
      });
    }

    ConfigLoader.config.embedding.push(config);
    this.saveConfig();
  }

  removeEmbeddingModelConfig(modelName: string): boolean {
    const initialLength = ConfigLoader.config.embedding.length;
    ConfigLoader.config.embedding = ConfigLoader.config.embedding.filter(
      (m) => m.model !== modelName
    );

    if (ConfigLoader.config.embedding.length !== initialLength) {
      this.saveConfig();
      return true;
    }

    return false;
  }

  getAllEmbeddingModelConfigs(): ModelConfig[] {
    return ConfigLoader.config.embedding;
  }

  getDefaultChatModel(): ModelConfig | null {
    return ConfigLoader.config.chat.find((model) => model.default) || null;
  }

  getDefaultEmbeddingModel(): ModelConfig | null {
    return ConfigLoader.config.embedding.find((model) => model.default) || null;
  }

  getDownloadableModels(): ModelConfig[] {
    const chatModels = ConfigLoader.config.chat.filter((m) => !m.endpoint);
    const embeddingModels = ConfigLoader.config.embedding.filter(
      (m) => !m.endpoint
    );
    return [...chatModels, ...embeddingModels];
  }

  validateConfig() {
    if (!ConfigLoader.config) {
      ConfigLoader.config = { chat: [], embedding: [] };
    }

    if (typeof ConfigLoader.config !== 'object') {
      throw new Error('Invalid configuration: Must be an object');
    }

    // 验证 chat 模型配置
    if (!Array.isArray(ConfigLoader.config.chat)) {
      throw new Error("Invalid configuration: 'chat' must be an array");
    }

    ConfigLoader.config.chat.forEach((model, index) => {
      if (!model.model) {
        throw new Error(
          `Invalid chat model configuration at index ${index}: 'model' is required`
        );
      }
    });

    const defaultChatModels = ConfigLoader.config.chat.filter(
      (model) => model.default
    );
    if (defaultChatModels.length > 1) {
      throw new Error(
        'Invalid configuration: Multiple default chat models found'
      );
    }

    if (!Array.isArray(ConfigLoader.config.embedding)) {
      throw new Error("Invalid configuration: 'embedding' must be an array");
    }

    ConfigLoader.config.embedding.forEach((model, index) => {
      if (!model.model) {
        throw new Error(
          `Invalid embedding model configuration at index ${index}: 'model' is required`
        );
      }
    });

    const defaultEmbeddingModels = ConfigLoader.config.embedding.filter(
      (model) => model.default
    );
    if (defaultEmbeddingModels.length > 1) {
      throw new Error(
        'Invalid configuration: Multiple default embedding models found'
      );
    }
  }

  getConfig(): AppConfig {
    return ConfigLoader.config;
  }
}
