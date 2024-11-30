import * as fs from 'fs';
import * as path from 'path';
import _ from 'lodash';
export interface ChatConfig {
   model: string;
  endpoint?: string;
  token?: string;
    default?: boolean;
    task?: string;
}
export class ConfigLoader{
    private config: ChatConfig;

    private readonly configPath: string;

    constructor() {
        this.configPath = path.resolve(__dirname, "config.json");
        this.loadConfig();
    }

    private loadConfig() {
        const file = fs.readFileSync(this.configPath, "utf-8");
        this.config = JSON.parse(file);
    }

    get<T>(path: string) {
        return _.get(this.config, path);
    }

    set(path: string, value: any) {
        _.set(this.config, path, value);
        this.saveConfig();
    }

    private saveConfig() {
        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 4), "utf-8");
    }

    validateConfig(){
        if (!this.config) {
            throw new Error("Invalid configuration: 'chats' section is missing.");
        }
    }
}