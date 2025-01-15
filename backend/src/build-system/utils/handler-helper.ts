import { MessageInterface } from "src/common/model-provider/types";
import { BuilderContext } from "../context";
import { BuildMonitor } from "../monitor";

export async function chatSyncWithClocker(context: BuilderContext, messages: MessageInterface[], model: string, step: string, id: string): Promise<any>{
    const startTime = new Date();
      const modelResponse = await context.model.chatSync({
        model,
        messages,
      });
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();
      BuildMonitor.timeRecorder(
        duration,
        id,
        step,
        messages,
        modelResponse,
      );
      return modelResponse;
}