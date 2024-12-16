import { Logger } from '@nestjs/common';
import { BuilderContext } from './context';
import { BuildNode, BuildSequence, BuildStep } from './types';
import { v4 as uuidv4 } from 'uuid';

export class BuildSequenceExecutor {
  private static logger: Logger = new Logger(
    `BuildSequenceExecutor-${uuidv4()}`,
  );

  /**
   * Execute a single node.
   * If the node is completed, do nothing.
   * If dependencies aren't ready, wait and retry.
   */
  static async executeNode(
    node: BuildNode,
    context: BuilderContext,
  ): Promise<void> {
    try {
      // Check if node is already completed
      if (context.getExecutionState().completed.has(node.id)) {
        return;
      }

      // If dependencies are not met, wait and retry
      if (!context.canExecute(node.id)) {
        this.logger.log(
          `Waiting for dependencies of node ${node.id}: ${node.requires?.join(', ')}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        return;
      }

      this.logger.log(`Executing node ${node.id}`);
      // Execute the node using the updated context method
      await context.executeNodeById(node.id);
    } catch (error) {
      this.logger.error(`Error executing node ${node.id}:`, error);
      throw error;
    }
  }

  /**
   * Execute a single step.
   * If the step is parallel, attempt to run all nodes concurrently (respecting dependencies).
   * If not parallel, run nodes in sequence.
   */
  static async executeStep(
    step: BuildStep,
    context: BuilderContext,
  ): Promise<void> {
    this.logger.log(`Executing build step: ${step.id}`);

    if (step.parallel) {
      let remainingNodes = [...step.nodes];
      let lastLength = remainingNodes.length;
      let retryCount = 0;
      const maxRetries = 10;

      while (remainingNodes.length > 0 && retryCount < maxRetries) {
        // Identify nodes that can be executed now
        const executableNodes = remainingNodes.filter((node) =>
          context.canExecute(node.id),
        );

        if (executableNodes.length > 0) {
          // Execute all currently executable nodes in parallel
          await Promise.all(
            executableNodes.map((node) => this.executeNode(node, context)),
          );

          // Filter out completed nodes
          remainingNodes = remainingNodes.filter(
            (node) => !context.getExecutionState().completed.has(node.id),
          );

          // If progress is made, reset retryCount
          if (remainingNodes.length < lastLength) {
            retryCount = 0;
            lastLength = remainingNodes.length;
          } else {
            retryCount++;
          }
        } else {
          // No executable nodes currently, wait and retry
          await new Promise((resolve) => setTimeout(resolve, 100));
          retryCount++;
        }
      }

      // If after max retries some nodes are still not completed, throw an error
      if (remainingNodes.length > 0) {
        throw new Error(
          `Unable to complete all nodes in step ${step.id}. Remaining: ${remainingNodes
            .map((n) => n.id)
            .join(', ')}`,
        );
      }
    } else {
      // Sequential execution
      for (const node of step.nodes) {
        let retryCount = 0;
        const maxRetries = 10;

        while (
          !context.getExecutionState().completed.has(node.id) &&
          retryCount < maxRetries
        ) {
          await this.executeNode(node, context);

          if (!context.getExecutionState().completed.has(node.id)) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            retryCount++;
          }
        }

        if (!context.getExecutionState().completed.has(node.id)) {
          this.logger.warn(
            `Failed to execute node ${node.id} after ${maxRetries} attempts`,
          );
        }
      }
    }
  }

  /**
   * Execute the entire build sequence.
   * Iterates through each step, executing them in order.
   * If a step fails to complete all its nodes, logs a warning and returns.
   */
  static async executeSequence(
    sequence: BuildSequence,
    context: BuilderContext,
  ): Promise<void> {
    this.logger.log(`Starting build sequence: ${sequence.id}`);

    for (const step of sequence.steps) {
      await this.executeStep(step, context);

      const incompletedNodes = step.nodes.filter(
        (node) => !context.getExecutionState().completed.has(node.id),
      );

      if (incompletedNodes.length > 0) {
        this.logger.warn(
          `Step ${step.id} failed to complete nodes: ${incompletedNodes
            .map((n) => n.id)
            .join(', ')}`,
        );
        return;
      }
    }

    this.logger.log(`Build sequence completed: ${sequence.id}`);
    this.logger.log('Final execution state:', context.getExecutionState());
  }
}
