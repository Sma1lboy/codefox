import { Response } from 'express';
import { GenerateMessageParams } from '../types';

export interface EmbeddingProvider {
  initialize(): Promise<void>;
  generateEmbResponse(params: GenerateMessageParams,
    res: Response,): Promise<void>;
  getEmbList(res: Response): Promise<void>;
}
