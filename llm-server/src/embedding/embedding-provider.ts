import { Response } from 'express';
import { GenerateMessageParams } from '../types';
export abstract class EmbProvider {
  abstract init(): Promise<void>;
  abstract generateEmbResponse(
    params: GenerateMessageParams,
    res: Response,
  ): Promise<void>;
  abstract getEmbList(res: Response): Promise<void>;
}
