import { pipeline, env, PipelineType } from "@huggingface/transformers";
import { ConfigService } from "../config/config.service";

type Progress = { loaded: number; total: number };
type ProgressCallback = (progress: Progress) => void;

env.allowLocalModels = false;

class PipelineSingleton {
    static pipelines = new Map<string, any>();

    static async getPipeline(task: string, model: string, progressCallback?: ProgressCallback) {
        const pipelineOptions = progressCallback ? { progress_callback: progressCallback } : undefined;

        const pipelineInstance = await pipeline(task as PipelineType, model, pipelineOptions);

        if (!this.pipelines.has(model)) {
            this.pipelines.set(model, pipelineInstance);
        }
        return this.pipelines.get(model);
    }
}

export default async function loadAllChatsModels(progressCallback: ProgressCallback = () => {}) {
    const configService = new ConfigService();
    const chats = configService.get("chats");
    const res = configService.validateConfig();

    for (const chatKey in chats) {
        if (Object.prototype.hasOwnProperty.call(chats, chatKey)) {
            const { model: modelName, task = "text-generation" } = chats[chatKey];

            try {
                const pipelineInstance = await PipelineSingleton.getPipeline(task, modelName, (progress: Progress) => {
                    progressCallback(progress);
                });

                console.log(`Model loaded successfully: ${modelName}`);

                // const inputText = "1 + 1 is?";
                // const output = await pipelineInstance(inputText);
                // console.log(`Model output for ${modelName}:`, output);

                loadedModels.set(chatKey, pipelineInstance);
            } catch (error) {
                console.error(`Failed to load model ${modelName}:`, error);
            }
        }
    }
}

const loadedModels = new Map<string, any>();

export function getModel(chatKey: string) {
    return loadedModels.get(chatKey);
}
