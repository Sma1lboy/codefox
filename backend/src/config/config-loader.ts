import * as fs from 'fs';
import * as _ from 'lodash';
import { getConfigPath } from './common-path';
import { Logger } from '@nestjs/common';
import * as path from 'path';

export interface EmbeddingConfig {
  model: string;
  endpoint?: string;
  default?: boolean;
  token?: string;
}

export interface AppConfig {
  embeddings?: EmbeddingConfig[];
}

export const exampleConfigContent = `{
  // Embedding model configuration
  // You can configure multiple embedding models
  "embeddings": [
    {
      "model": "text-embedding-ada-002",
      "endpoint": "https://api.openai.com/v1",
      "token": "your-openai-token",     // Replace with your OpenAI token
      "default": true                  // Set as default embedding
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

  addConfig(config: EmbeddingConfig) {
    if (!ConfigLoader.config.embeddings) {
      ConfigLoader.config.embeddings = [];
    }

    const index = ConfigLoader.config.embeddings.findIndex(
      (emb) => emb.model === config.model,
    );
    if (index !== -1) {
      ConfigLoader.config.embeddings.splice(index, 1);
    }

    if (config.default) {
      ConfigLoader.config.embeddings.forEach((emb) => {
        emb.default = false;
      });
    }

    ConfigLoader.config.embeddings.push(config);
    this.saveConfig();
  }

  removeConfig(modelName: string): boolean {
    if (!ConfigLoader.config.embeddings) {
      return false;
    }

    const initialLength = ConfigLoader.config.embeddings.length;
    ConfigLoader.config.embeddings = ConfigLoader.config.embeddings.filter(
      (emb) => emb.model !== modelName,
    );

    if (ConfigLoader.config.embeddings.length !== initialLength) {
      this.saveConfig();
      return true;
    }

    return false;
  }

  getAllConfigs(): EmbeddingConfig[] | null {
    return ConfigLoader.config.embeddings || null;
  }

  validateConfig() {
    if (!ConfigLoader.config) {
      ConfigLoader.config = {};
    }

    if (typeof ConfigLoader.config !== 'object') {
      throw new Error('Invalid configuration: Must be an object');
    }

    if (ConfigLoader.config.embeddings) {
      if (!Array.isArray(ConfigLoader.config.embeddings)) {
        throw new Error("Invalid configuration: 'embeddings' must be an array");
      }

      ConfigLoader.config.embeddings.forEach((emb, index) => {
        if (!emb.model) {
          throw new Error(
            `Invalid embedding configuration at index ${index}: 'model' is required`,
          );
        }
      });

      const defaultEmbeddings = ConfigLoader.config.embeddings.filter(
        (emb) => emb.default,
      );
      if (defaultEmbeddings.length > 1) {
        throw new Error(
          'Invalid configuration: Multiple default embedding configurations found',
        );
      }
    }
  }

  getConfig(): AppConfig {
    return ConfigLoader.config;
  }
}
