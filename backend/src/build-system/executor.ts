import { Logger } from '@nestjs/common';
import { BuilderContext } from './context';
import { BuildNode, BuildSequence, BuildStep } from './types';
import { v4 as uuidv4 } from 'uuid';

export class BuildSequenceExecutor {
  private static logger: Logger = new Logger(
    `BuildSequenceExecutor-${uuidv4()}`,
  );

  /**
   * 执行单个节点
   */
  static async executeNode(
    node: BuildNode,
    context: BuilderContext,
  ): Promise<void> {
    try {
      if (context.getState().completed.has(node.id)) {
        return; // 如果节点已完成，跳过
      }

      if (!context.canExecute(node.id)) {
        this.logger.log(
          `Waiting for dependencies: ${node.requires?.join(', ')}`,
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        return;
      }

      const dependenciesResults = node.requires?.map((depId) =>
        context.getResult(depId),
      );

      this.logger.log(
        `Executing node ${node.id} with dependencies:`,
        dependenciesResults,
      );

      await context.run(node.id, dependenciesResults);
    } catch (error) {
      this.logger.error(`Error executing node ${node.id}:`, error);
      throw error;
    }
  }

  /**
   * 执行单个步骤
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
        const executableNodes = remainingNodes.filter((node) =>
          context.canExecute(node.id),
        );

        if (executableNodes.length > 0) {
          await Promise.all(
            executableNodes.map((node) => this.executeNode(node, context)),
          );

          remainingNodes = remainingNodes.filter(
            (node) => !context.getState().completed.has(node.id),
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
          !context.getState().completed.has(node.id) &&
          retryCount < maxRetries
        ) {
          await this.executeNode(node, context);

          if (!context.getState().completed.has(node.id)) {
            await new Promise((resolve) => setTimeout(resolve, 100));
            retryCount++;
          }
        }

        if (!context.getState().completed.has(node.id)) {
          this.logger.warn(
            `Failed to execute node ${node.id} after ${maxRetries} attempts`,
          );
        }
      }
    }
  }

  /**
   * 执行整个序列
   */
  static async executeSequence(
    sequence: BuildSequence,
    context: BuilderContext,
  ): Promise<void> {
    this.logger.log(`Starting build sequence: ${sequence.id}`);

    for (const step of sequence.steps) {
      await this.executeStep(step, context);

      const incompletedNodes = step.nodes.filter(
        (node) => !context.getState().completed.has(node.id),
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
    this.logger.log('Final state:', context.getState());
  }
}
