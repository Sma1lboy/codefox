import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';
export interface ChatsConfig {
  [key: string]: ChatConfig;
}
export interface ChatConfig {
  model: string;
  endpoint?: string;
  token?: string;
  default?: boolean;
  task?: string;
}
export class ConfigLoader {
  private chatsConfig: ChatsConfig;

  private readonly configPath: string;

  constructor() {
    this.configPath = path.resolve(__dirname, 'config.json');
    this.loadConfig();
    console.log('111' + this.chatsConfig);
  }

  private loadConfig() {
    const file = fs.readFileSync(this.configPath, 'utf-8');
    this.chatsConfig = JSON.parse(file);
  }

  get<T>(path: string) {
    return _.get(this.chatsConfig, path);
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
