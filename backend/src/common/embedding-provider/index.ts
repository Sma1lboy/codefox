import { HttpService } from "@nestjs/axios";
import { Logger } from "@nestjs/common";
import { rejects } from "assert";
import { resolve } from "path";

export interface ModelProviderConfig {
    endpoint: string;
    defaultModel?: string;
  }

export class EmbeddingProvider {
    private static instance: EmbeddingProvider | undefined = undefined;
    private logger = new Logger(EmbeddingProvider.name);
    constructor(private readonly httpService: HttpService, private readonly config: ModelProviderConfig) {}
    
    public static getInstance() {
        if(!this.instance){
            this.instance = new EmbeddingProvider(new HttpService(), {
                endpoint: 'http://localhost:3001',
            });
        }
        return this.instance;
    }

    public async generateEmbResponse(input: string, model: string){
        try{
            const res = this.httpService.post(`${this.config.endpoint}/embedding`, {
                content: input,
                model: model,
            });
            await new Promise((resolve, rejects) => {
                res.subscribe({
                next: (value) => {
                    console.log(value);
                    resolve(value);
                },
                error: (error) => {
                    this.logger.error(error);
                    rejects(null);
                }
            })
            })
        } catch (error) {
            this.logger.error(error);
           return null;
        }
    }
}
