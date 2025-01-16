import { ChatInput } from 'src/common/model-provider/types';
import { BuilderContext } from '../context';
import { BuildMonitor } from '../monitor';

export async function chatSyncWithClocker(
  context: BuilderContext,
  input: ChatInput,
  step: string,
  id: string,
): Promise<string> {
  const startTime = new Date();
  const modelResponse = await context.model.chatSync(input);
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  const inputContent = input.messages.map((m) => m.content).join('');
  BuildMonitor.timeRecorder(duration, id, step, inputContent, modelResponse);
  return modelResponse;
}
