import { BuilderContext } from './context';
import { BuildNode, BuildSequence, BuildStep } from './types';

export class BuildSequenceExecutor {
  constructor(private context: BuilderContext) {}

  private async executeNode(node: BuildNode): Promise<void> {
    if (!this.context.canExecute(node.id)) {
      console.log(`Waiting for dependencies: ${node.requires?.join(', ')}`);
      return;
    }

    await this.context.run(node.id);
  }

  private async executeStep(step: BuildStep): Promise<void> {
    console.log(`Executing build step: ${step.id}`);

    if (step.parallel) {
      const executableNodes = step.nodes.filter((node) =>
        this.context.canExecute(node.id),
      );

      await Promise.all(executableNodes.map((node) => this.executeNode(node)));

      const remainingNodes = step.nodes.filter(
        (node) => !executableNodes.includes(node),
      );

      if (remainingNodes.length > 0) {
        await this.executeStep({
          ...step,
          nodes: remainingNodes,
        });
      }
    } else {
      // 串行执行
      for (const node of step.nodes) {
        await this.executeNode(node);
      }
    }
  }

  async executeSequence(sequence: BuildSequence): Promise<void> {
    console.log(`Starting build sequence: ${sequence.id}`);

    for (const step of sequence.steps) {
      await this.executeStep(step);
    }

    console.log(`Build sequence completed: ${sequence.id}`);
    console.log('Final state:', this.context.getState());
  }
}
