import { Response } from "express";
import OpenAI from "openai";
import { ModelProvider } from "./model-provider.js";

export class OpenAIModelProvider extends ModelProvider {
  private openai: OpenAI;

  async initialize(): Promise<void> {
    console.log("Initializing OpenAI model...");
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    console.log("api key: " + process.env.OPENAI_API_KEY);
    console.log("OpenAI model initialized.");
  }

  async generateStreamingResponse(
    content: string,
    res: Response
  ): Promise<void> {
    console.log("Generating streaming response with OpenAI...");
    const startTime = Date.now();

    try {
      const stream = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: content }],
        stream: true,
      });

      let chunkCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          chunkCount++;
          console.log(`Sending chunk #${chunkCount}: "${content}"`);
          res.write(
            `data: ${JSON.stringify({ role: "bot", content: content })}\n\n`
          );
        }
      }

      const endTime = Date.now();
      console.log(`Response generation completed. Total chunks: ${chunkCount}`);
      console.log(`Generation time: ${endTime - startTime}ms`);

      res.write(`data: [DONE]\n\n`);
      res.end();
      console.log("Response stream ended.");
    } catch (error) {
      console.error("Error during OpenAI response generation:", error);
      res.write(`data: ${JSON.stringify({ error: "Generation failed" })}\n\n`);
      res.write(`data: [DONE]\n\n`);
      res.end();
    }
  }
}
