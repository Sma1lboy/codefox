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

export class LLMServer {
  private app: Express;
  private modelProvider: ModelProvider;
  private readonly PORT: number;

  constructor(modelProviderType: "llama" | "openai" = "llama") {
    this.app = express();
    this.app.use(express.json());
    this.PORT = parseInt(process.env.PORT || "3001", 10);
    console.log(`Server initialized with PORT: ${this.PORT}`);

    if (modelProviderType === "openai") {
      this.modelProvider = new OpenAIModelProvider();
    } else {
      this.modelProvider = new LlamaModelProvider();
    }
  }

  async initialize(): Promise<void> {
    console.log("Initializing LLM server...");
    await this.modelProvider.initialize();
    this.setupRoutes();
    await this.startServer();
    console.log("LLM server fully initialized and ready.");
  }

  private setupRoutes(): void {
    console.log("Setting up routes...");
    this.app.post("/chat", this.handleChatRequest.bind(this));
    console.log("Routes set up successfully.");
  }

  private async handleChatRequest(req: Request, res: Response): Promise<void> {
    console.log("Received chat request.");
    try {
      console.log(JSON.stringify(req.body));
      const { content } = req.body as ChatMessageInput;
      console.log(`Request content: "${content}"`);

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      console.log("Response headers set for streaming.");

      await this.modelProvider.generateStreamingResponse(content, res);
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async startServer(): Promise<void> {
    this.app.listen(this.PORT, () => {
      console.log(`LLM server running on port ${this.PORT}`);
    });
  }
}
