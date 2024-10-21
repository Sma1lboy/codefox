import express, { Express, Request, Response } from "express";
import { ModelProvider } from "./model/model-provider.js";
import { OpenAIModelProvider } from "./model/openai-model-provider.js";
import { LlamaModelProvider } from "./model/llama-model-provider.js";

export interface ChatMessageInput {
  content: string;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export class LLMProvider {
  private modelProvider: ModelProvider;

  constructor(modelProviderType: "llama" | "openai" = "llama") {
    if (modelProviderType === "openai") {
      this.modelProvider = new OpenAIModelProvider();
    } else {
      this.modelProvider = new LlamaModelProvider();
    }
  }

  async initialize(): Promise<void> {
    console.log("Initializing LLM provider...");
    await this.modelProvider.initialize();
    console.log("LLM provider fully initialized and ready.");
  }

  async generateStreamingResponse(
    content: string,
    res: Response
  ): Promise<void> {
    await this.modelProvider.generateStreamingResponse(content, res);
  }
}
