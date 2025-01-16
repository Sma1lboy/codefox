import { ModelInstance } from '../types';
import { RemoteOpenAIModelEngine } from './remote-model-instance';
import { ModelConfig } from 'codefox-common';

export class RemoteModelFactory {
  private static instances: Map<string, ModelInstance> = new Map();

  static async createInstance(
    config: ModelConfig,
    modelName: string,
  ): Promise<ModelInstance> {
    if (!config.endpoint || !config.token) {
      throw new Error('Remote model requires endpoint and token configuration');
    }

    const key = `${config.endpoint}:${config.token}:${modelName}`;
    if (!this.instances.has(key)) {
      const instance = new RemoteOpenAIModelEngine(
        config.endpoint,
        config.token,
        modelName,
      );
      this.instances.set(key, instance);
    }
    return this.instances.get(key)!;
  }

  static isRemoteModel(config: ModelConfig): boolean {
    return Boolean(config.endpoint && config.token);
  }

  static reset(): void {
    this.instances.clear();
  }
}

// Re-export types for usage
export type { RemoteOpenAIModelEngine as RemoteModelInstance };
