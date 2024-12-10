import { Response } from 'express';
import { GenerateMessageParams } from '../type/GenerateMessage';

export abstract class ModelProvider {
  abstract initialize(): Promise<void>;
  abstract generateStreamingResponse(
    params: GenerateMessageParams,
    res: Response,
  ): Promise<void>;

  abstract getModelTagsResponse(res: Response): Promise<void>;
}
