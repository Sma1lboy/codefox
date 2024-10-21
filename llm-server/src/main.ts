import { ChatMessageInput, LLMProvider } from "./llm-provider.js";
import express, { Express, Request, Response } from "express";
export class App {
  private app: Express;
  private readonly PORT: number;
  private llmProvider: LLMProvider;

  constructor(llmProvider: LLMProvider) {
    this.app = express();
    this.app.use(express.json());
    this.PORT = parseInt(process.env.PORT || "3001", 10);
    this.llmProvider = llmProvider;
    console.log(`App initialized with PORT: ${this.PORT}`);
  }

  setupRoutes(): void {
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
      await this.llmProvider.generateStreamingResponse(content, res);
    } catch (error) {
      console.error("Error in chat endpoint:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }

  async start(): Promise<void> {
    this.setupRoutes();
    this.app.listen(this.PORT, () => {
      console.log(`Server running on port ${this.PORT}`);
    });
  }
}
async function main() {
  const llmProvider = new LLMProvider("openai");
  await llmProvider.initialize();

  const app = new App(llmProvider);
  await app.start();
}

main().catch((error) => {
  console.error("Failed to start the application:", error);
  process.exit(1);
});
