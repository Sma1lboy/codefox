import express, { Express, Request, Response } from "express";
import {
  getLlama,
  LlamaChatSession,
  LlamaContext,
  LlamaModel,
} from "node-llama-cpp";
import path from "path";

interface ChatMessageInput {
  content: string;
}

interface ChatMessage {
  role: string;
  content: string;
}

class LLMServer {
  private app: Express;
  private model: LlamaModel;
  private context: LlamaContext;
  private readonly PORT: number;

  constructor() {
    this.app = express();
    this.app.use(express.json());
    this.PORT = parseInt(process.env.PORT || "3001", 10);
  }

  async initialize(): Promise<void> {
    await this.initializeModel();
    this.setupRoutes();
    await this.startServer();
  }

  private async initializeModel(): Promise<void> {
    const llama = await getLlama();
    this.model = await llama.loadModel({
      modelPath: path.join(
        process.cwd(),
        "..",
        "models",
        "LLAMA-3.2-1B-OpenHermes2.5.IQ4_XS.gguf"
      ),
    });
    this.context = await this.model.createContext();
    console.log("Llama model initialized");
  }

  private setupRoutes(): void {
    this.app.post("/chat", this.handleChatRequest.bind(this));
  }

  private async handleChatRequest(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body as ChatMessageInput;
      const response = await this.generateResponse({ content });
      res.json(response);
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  private async generateResponse(
    input: ChatMessageInput
  ): Promise<ChatMessage> {
    const session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
    });
    const response = await session.prompt(input.content);
    return {
      role: "bot",
      content: response,
    };
  }

  private async startServer(): Promise<void> {
    this.app.listen(this.PORT, () => {
      console.log(`LLM server running on port ${this.PORT}`);
    });
  }
}

const server = new LLMServer();
server.initialize().catch((error) => {
  console.error("Failed to initialize LLM server:", error);
  process.exit(1);
});
