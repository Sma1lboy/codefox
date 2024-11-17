import { Logger } from '@nestjs/common';
import { BuilderContext } from './context';
import { BuildNode, BuildSequence, BuildStep } from './types';
import { v4 as uuidv4 } from 'uuid';

export class BuildSequenceExecutor {
  constructor(private context: BuilderContext) {}

  private logger: Logger = new Logger(`BuildSequenceExecutor-${uuidv4()}`);
  private async executeNode(node: BuildNode): Promise<void> {
    try {
      if (this.context.getState().completed.has(node.id)) {
        return;
      }

      if (!this.context.canExecute(node.id)) {
        this.logger.log(
          `Waiting for dependencies: ${node.requires?.join(', ')}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        return;
      }

      const dependenciesResults = node.requires?.map((depId) =>
        this.context.getResult(depId),
      );

      this.logger.log(
        `Executing node ${node.id} with dependencies:`,
        dependenciesResults,
      );

      await this.context.run(node.id, dependenciesResults);
    } catch (error) {
      this.logger.error(`Error executing node ${node.id}:`, error);
      throw error;
    }
  }

  private async executeStep(step: BuildStep): Promise<void> {
    this.logger.log(`Executing build step: ${step.id}`);

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
          this.logger.warn(
            `Failed to execute node ${node.id} after ${maxRetries} attempts`,
          );
        }
      }
    }
  }

  async executeSequence(sequence: BuildSequence): Promise<void> {
    this.logger.log(`Starting build sequence: ${sequence.id}`);

    for (const step of sequence.steps) {
      await this.executeStep(step);

      const incompletedNodes = step.nodes.filter(
        (node) => !this.context.getState().completed.has(node.id),
      );

      if (incompletedNodes.length > 0) {
        // TODO: change to error log
        this.logger.warn(
          `Step ${step.id} failed to complete nodes: ${incompletedNodes
            .map((n) => n.id)
            .join(', ')}`,
        );
        return;
      }
    }

    this.logger.log(`Build sequence completed: ${sequence.id}`);
    this.logger.log('Final state:', this.context.getState());
  }
}
