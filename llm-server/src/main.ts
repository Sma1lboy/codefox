import { LLMServer } from "./server.js";

const server = new LLMServer("openai");
server.initialize().catch((error) => {
  console.error("Failed to initialize LLM server:", error);
  process.exit(1);
});
