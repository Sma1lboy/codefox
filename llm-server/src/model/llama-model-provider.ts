import { Response } from "express";
import path from "path";
import {
  getLlama,
  LlamaChatSession,
  LlamaContext,
  LlamaModel,
} from "node-llama-cpp";
import { ModelProvider } from "./model-provider.js";

//TODO: using protocol class
export class LlamaModelProvider extends ModelProvider {
  private model: LlamaModel;
  private context: LlamaContext;

  async initialize(): Promise<void> {
    console.log("Initializing Llama model...");
    const llama = await getLlama();
    const modelPath = path.join(
      process.cwd(),
      "models",
      "LLAMA-3.2-1B-OpenHermes2.5.IQ4_XS.gguf"
    );
    console.log(`Loading model from path: ${modelPath}`);
    this.model = await llama.loadModel({
      modelPath: modelPath,
    });
    console.log("Model loaded successfully.");
    this.context = await this.model.createContext();
    console.log("Llama model initialized and context created.");
  }

  async generateStreamingResponse(
    content: string,
    res: Response
  ): Promise<void> {
    console.log("Generating streaming response with Llama...");
    const session = new LlamaChatSession({
      contextSequence: this.context.getSequence(),
    });
    console.log("LlamaChatSession created.");

    let chunkCount = 0;
    const startTime = Date.now();

    try {
      await session.prompt(content, {
        onTextChunk: (chunk) => {
          chunkCount++;
          console.log(`Sending chunk #${chunkCount}: "${chunk}"`);
          res.write(
            `data: ${JSON.stringify({ role: "bot", content: chunk })}\n\n`
          );
        },
      });

      const endTime = Date.now();
      console.log(`Response generation completed. Total chunks: ${chunkCount}`);
      console.log(`Generation time: ${endTime - startTime}ms`);

      res.write(`data: [DONE]\n\n`);
      res.end();
      console.log("Response stream ended.");
    } catch (error) {
      console.error("Error during response generation:", error);
      res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}
