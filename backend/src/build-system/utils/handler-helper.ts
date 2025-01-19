import { ChatInput } from 'src/common/model-provider/types';
import { BuilderContext } from '../context';
import { BuildMonitor } from '../monitor';

export async function chatSyncWithClocker(
  context: BuilderContext,
  input: ChatInput,
  step: string,
  name: string,
): Promise<string> {
  const startTime = new Date();
  const modelResponse = await context.model.chatSync(input);
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  const inputContent = input.messages.map((m) => m.content).join('');
  BuildMonitor.timeRecorder(duration, name, step, inputContent, modelResponse);
  return modelResponse;
}

export async function batchChatSyncWithClock(
  context: BuilderContext,
  step: string,
  id: string,
  inputs: ChatInput[],
): Promise<string[]> {
  const startTime = new Date();
  const modelResponses = await context.model.batchChatSync(inputs);
  const endTime = new Date();
  const duration = endTime.getTime() - startTime.getTime();

  const inputContent = inputs
    .map((input) => input.messages.map((m) => m.content).join(''))
    .join('');
  BuildMonitor.timeRecorder(
    duration,
    id,
    step,
    inputContent,
    modelResponses.join(''),
  );
  return modelResponses;
}
