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

export class ConfigLoader {
  private chatsConfig: ChatConfig[];

  private readonly configPath: string;

  constructor() {
    this.configPath = getConfigPath('config');
    this.loadConfig();
  }

  private loadConfig() {
    const file = fs.readFileSync(this.configPath, 'utf-8');

    this.chatsConfig = JSON.parse(file);
    console.log('Raw file content:', this.chatsConfig);
  }

  get<T>(path: string) {
    if (!path) {
      return this.chatsConfig as unknown as T;
    }
    return _.get(this.chatsConfig, path) as T;
  }

  set(path: string, value: any) {
    _.set(this.chatsConfig, path, value);
    this.saveConfig();
  }

  private saveConfig() {
    fs.writeFileSync(
      this.configPath,
      JSON.stringify(this.chatsConfig, null, 4),
      'utf-8',
    );
  }

  validateConfig() {
    if (!this.chatsConfig) {
      throw new Error("Invalid configuration: 'chats' section is missing.");
    }
  }
}
