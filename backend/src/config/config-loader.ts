import * as fs from 'fs';
import * as _ from 'lodash';
import { getConfigPath } from './common-path';
import { ConfigType } from 'src/downloader/universal-utils';
import { Logger } from '@nestjs/common';

export interface ModelConfig {
  model: string;
  endpoint?: string;
  token?: string;
  default?: boolean;
  task?: string;
}

export interface EmbeddingConfig {
  model: string;
  endpoint?: string;
  default?: boolean;
  token?: string;
}

export interface AppConfig {
  models?: ModelConfig[];
  embeddings?: EmbeddingConfig[];
}

export const exampleConfigContent = `{
  // Chat models configuration
  // You can configure multiple chat models
  "models": [
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
      "endpoint": "http://localhost:11434/v1"
    }
  ],

  // Embedding model configuration (optional)
  "embeddings": [{
    "model": "text-embedding-ada-002",
    "endpoint": "https://api.openai.com/v1",
    "token": "your-openai-token",     // Replace with your OpenAI token
    "default": true                // Set as default embedding
  }]
}`;

export class ConfigLoader {
  readonly logger = new Logger(ConfigLoader.name);
  private type: string;
  private static instances: Map<ConfigType, ConfigLoader> = new Map();
  private static config: AppConfig;
  private readonly configPath: string;

  private constructor(type: ConfigType) {
    this.type = type;
    this.configPath = getConfigPath();
    this.initConfigFile();
    this.loadConfig();
  }

  public static getInstance(type: ConfigType): ConfigLoader {
    if (!ConfigLoader.instances.has(type)) {
      ConfigLoader.instances.set(type, new ConfigLoader(type));
    }
    return ConfigLoader.instances.get(type)!;
  }

  public initConfigFile(): void {
    Logger.log('Creating example config file', 'ConfigLoader');

    const config = getConfigPath();
    if (fs.existsSync(config)) {
      return;
    }

    if (!fs.existsSync(config)) {
      //make file
      fs.writeFileSync(config, exampleConfigContent, 'utf-8');
    }
    Logger.log('Creating example config file', 'ConfigLoader');
  }

  public reload(): void {
    this.loadConfig();
  }

  private loadConfig() {
    try {
      Logger.log(
        `Loading configuration from ${this.configPath}`,
        'ConfigLoader',
      );
      const file = fs.readFileSync(this.configPath, 'utf-8');
      const jsonContent = file.replace(
        /\\"|"(?:\\"|[^"])*"|(\/\/.*|\/\*[\s\S]*?\*\/)/g,
        (m, g) => (g ? '' : m),
      );
      ConfigLoader.config = JSON.parse(jsonContent);
      this.validateConfig();
    } catch (error) {
      if (
        error.code === 'ENOENT' ||
        error.message.includes('Unexpected end of JSON input')
      ) {
        ConfigLoader.config = {};
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
      'utf-8',
    );
  }

  addConfig(config: ModelConfig | EmbeddingConfig) {
    if (!ConfigLoader.config[this.type]) {
      ConfigLoader.config[this.type] = [];
    }
    this.logger.log(ConfigLoader.config);
    const index = ConfigLoader.config[this.type].findIndex(
      (chat) => chat.model === config.model,
    );
    if (index !== -1) {
      ConfigLoader.config[this.type].splice(index, 1);
    }

    if (config.default) {
      ConfigLoader.config.models.forEach((chat) => {
        chat.default = false;
      });
    }

    ConfigLoader.config[this.type].push(config);
    this.saveConfig();
  }

  removeConfig(modelName: string): boolean {
    if (!ConfigLoader.config[this.type]) {
      return false;
    }

    const initialLength = ConfigLoader.config[this.type].length;
    ConfigLoader.config.models = ConfigLoader.config[this.type].filter(
      (chat) => chat.model !== modelName,
    );

    if (ConfigLoader.config[this.type].length !== initialLength) {
      this.saveConfig();
      return true;
    }

    return false;
  }

  getAllConfigs(): EmbeddingConfig[] | ModelConfig[] | null {
    const res = ConfigLoader.config[this.type];
    return Array.isArray(res) ? res : null;
  }

  validateConfig() {
    if (!ConfigLoader.config) {
      ConfigLoader.config = {};
    }

    if (typeof ConfigLoader.config !== 'object') {
      throw new Error('Invalid configuration: Must be an object');
    }

    if (ConfigLoader.config.models) {
      if (!Array.isArray(ConfigLoader.config.models)) {
        throw new Error("Invalid configuration: 'chats' must be an array");
      }

      ConfigLoader.config.models.forEach((chat, index) => {
        if (!chat.model) {
          throw new Error(
            `Invalid chat configuration at index ${index}: 'model' is required`,
          );
        }
      });

      const defaultChats = ConfigLoader.config.models.filter(
        (chat) => chat.default,
      );
      if (defaultChats.length > 1) {
        throw new Error(
          'Invalid configuration: Multiple default chat configurations found',
        );
      }
    }

    if (ConfigLoader.config[ConfigType.EMBEDDINGS]) {
      this.logger.log(ConfigLoader.config[ConfigType.EMBEDDINGS]);
      if (!Array.isArray(ConfigLoader.config[ConfigType.EMBEDDINGS])) {
        throw new Error("Invalid configuration: 'embeddings' must be an array");
      }

      ConfigLoader.config.models.forEach((emb, index) => {
        if (!emb.model) {
          throw new Error(
            `Invalid chat configuration at index ${index}: 'model' is required`,
          );
        }
      });

      const defaultChats = ConfigLoader.config[ConfigType.EMBEDDINGS].filter(
        (chat) => chat.default,
      );
      if (defaultChats.length > 1) {
        throw new Error(
          'Invalid configuration: Multiple default emb configurations found',
        );
      }
    }
  }

  getConfig(): AppConfig {
    return ConfigLoader.config;
  }
}
