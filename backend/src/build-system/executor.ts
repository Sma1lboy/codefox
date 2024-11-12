import { BuilderContext } from './context';
import { BuildNode, BuildSequence, BuildStep } from './types';

export class BuildSequenceExecutor {
  constructor(private context: BuilderContext) {}

  private async executeNode(node: BuildNode): Promise<void> {
    try {
      if (this.context.getState().completed.has(node.id)) {
        return;
      }

      if (!this.context.canExecute(node.id)) {
        console.log(`Waiting for dependencies: ${node.requires?.join(', ')}`);
        await new Promise((resolve) => setTimeout(resolve, 100)); // 添加小延迟
        return;
      }

      await this.context.run(node.id);
    } catch (error) {
      console.error(`Error executing node ${node.id}:`, error);
      throw error;
    }
  }

  private async executeStep(step: BuildStep): Promise<void> {
    console.log(`Executing build step: ${step.id}`);

    if (step.parallel) {
      let remainingNodes = [...step.nodes];
      let lastLength = remainingNodes.length;
      let retryCount = 0;
      const maxRetries = 10;

      while (remainingNodes.length > 0 && retryCount < maxRetries) {
        const executableNodes = remainingNodes.filter((node) =>
          this.context.canExecute(node.id),
        );

        if (executableNodes.length > 0) {
          await Promise.all(
            executableNodes.map((node) => this.executeNode(node)),
          );

          remainingNodes = remainingNodes.filter(
            (node) => !this.context.getState().completed.has(node.id),
          );

          if (remainingNodes.length < lastLength) {
            retryCount = 0;
            lastLength = remainingNodes.length;
          } else {
            retryCount++;
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 100));
          retryCount++;
        }
      }

      if (remainingNodes.length > 0) {
        throw new Error(
          `Unable to complete all nodes in step ${step.id}. Remaining: ${remainingNodes
            .map((n) => n.id)
            .join(', ')}`,
        );
      }
    } else {
      for (const node of step.nodes) {
        let retryCount = 0;
        const maxRetries = 10;

        while (
          !this.context.getState().completed.has(node.id) &&
          retryCount < maxRetries
        ) {
          await this.executeNode(node);

          if (!this.context.getState().completed.has(node.id)) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            retryCount++;
          }
        }

        if (!this.context.getState().completed.has(node.id)) {
          // TODO: change to error log
          console.warn(
            `Failed to execute node ${node.id} after ${maxRetries} attempts`,
          );
        }
      }
    }
  }

  async executeSequence(sequence: BuildSequence): Promise<void> {
    console.log(`Starting build sequence: ${sequence.id}`);

    for (const step of sequence.steps) {
      await this.executeStep(step);

      const incompletedNodes = step.nodes.filter(
        (node) => !this.context.getState().completed.has(node.id),
      );

      if (incompletedNodes.length > 0) {
        // TODO: change to error log
        console.warn(
          `Step ${step.id} failed to complete nodes: ${incompletedNodes
            .map((n) => n.id)
            .join(', ')}`,
        );
        return;
      }
    }

    console.log(`Build sequence completed: ${sequence.id}`);
    console.log('Final state:', this.context.getState());
  }
}
