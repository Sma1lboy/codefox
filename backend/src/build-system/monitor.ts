import { Logger } from '@nestjs/common';
import { BuildNode, BuildStep, BuildSequence } from './types';
import { ProjectEventLogger } from './logger';
import { MessageInterface } from 'src/common/model-provider/types';
import { OpenAIModelProvider } from 'src/common/model-provider/openai-model-provider';
/**
 * Metrics for sequence, step, and node execution
 */
export interface BuildReport {
  metadata: {
    projectId: string;
    sequenceId: string;
    timestamp: string;
    duration: number;
  };
  summary: {
    spendTime: string[];
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    successRate: number;
  };
  steps: Array<{
    id: string;
    name: string;
    duration: number;
    parallel: boolean;
    status: 'completed' | 'failed';
    nodesTotal: number;
    nodesCompleted: number;
    nodesFailed: number;
    nodes: Array<{
      id: string;
      name: string;
      duration: number;
      status: 'completed' | 'failed' | 'pending';
      retryCount: number;
      error?: {
        message: string;
        stack?: string;
      };
    }>;
  }>;
}

export interface NodeMetrics {
  nodeId: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'completed' | 'failed' | 'pending';
  memory?: number;
  tokensUsed?: number;
  retryCount: number;
  error?: Error;
}

export interface StepMetrics {
  stepId: string;
  startTime: number;
  endTime: number;
  duration: number;
  nodeMetrics: Map<string, NodeMetrics>;
  parallel: boolean;
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
}

export interface SequenceMetrics {
  sequenceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  stepMetrics: Map<string, StepMetrics>;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalNodes: number;
  successRate: number;
}

export class BuildMonitor {
  private static instance: BuildMonitor;
  private logger: Logger; // TODO: adding more logger
  private sequenceMetrics: Map<string, SequenceMetrics> = new Map();
  private static timeRecorders: Map<string, any[]> = new Map();

  private static model = OpenAIModelProvider.getInstance();

  private constructor() {
    this.logger = new Logger('BuildMonitor');
  }

  static getInstance(): BuildMonitor {
    if (!BuildMonitor.instance) {
      BuildMonitor.instance = new BuildMonitor();
    }
    return BuildMonitor.instance;
  }

  public static async timeRecorder(
    generateDuration: number,
    id: string,
    step: string,
    input: string,
    output: string,
  ) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const encoder = require('gpt-3-encoder');
    const inputLength = input.length;
    const value = {
      step,
      input: inputLength,
      output: encoder.encode(output).length,
      generateDuration,
    };
    if (!this.timeRecorders.has(id)) {
      this.timeRecorders.set(id, []);
    }
    this.timeRecorders.get(id)!.push(value);
  }

  // Node-level monitoring
  startNodeExecution(nodeId: string, sequenceId: string, stepId: string): void {
    const metrics = this.getOrCreateNodeMetrics(nodeId, sequenceId, stepId);
    metrics.startTime = Date.now();
    metrics.status = 'pending';
  }

  endNodeExecution(
    nodeId: string,
    sequenceId: string,
    stepId: string,
    success: boolean,
    error?: Error,
  ): void {
    const metrics = this.getOrCreateNodeMetrics(nodeId, sequenceId, stepId);
    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.status = success ? 'completed' : 'failed';
    if (error) {
      metrics.error = error;
    }
  }

  incrementNodeRetry(nodeId: string, sequenceId: string, stepId: string): void {
    const metrics = this.getOrCreateNodeMetrics(nodeId, sequenceId, stepId);
    metrics.retryCount++;
  }

  // Step-level monitoring
  startStepExecution(
    stepId: string,
    sequenceId: string,
    parallel: boolean,
    totalNodes: number,
  ): void {
    const metrics = this.getOrCreateStepMetrics(stepId, sequenceId);
    metrics.startTime = Date.now();
    metrics.parallel = parallel;
    metrics.totalNodes = totalNodes;
  }

  endStepExecution(stepId: string, sequenceId: string): void {
    const metrics = this.getStepMetrics(sequenceId, stepId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      // Calculate completion statistics
      metrics.completedNodes = Array.from(metrics.nodeMetrics.values()).filter(
        (n) => n.status === 'completed',
      ).length;
      metrics.failedNodes = Array.from(metrics.nodeMetrics.values()).filter(
        (n) => n.status === 'failed',
      ).length;
    }
  }

  // Sequence-level monitoring
  startSequenceExecution(sequence: BuildSequence): void {
    const metrics: SequenceMetrics = {
      sequenceId: sequence.id,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      stepMetrics: new Map(),
      totalSteps: sequence.steps.length,
      completedSteps: 0,
      failedSteps: 0,
      totalNodes: sequence.steps.reduce(
        (sum, step) => sum + step.nodes.length,
        0,
      ),
      successRate: 0,
    };
    this.sequenceMetrics.set(sequence.id, metrics);
  }

  async endSequenceExecution(
    sequenceId: string,
    projectUUID: string,
  ): Promise<void> {
    const metrics = this.sequenceMetrics.get(sequenceId);
    if (metrics) {
      metrics.endTime = Date.now();
      metrics.duration = metrics.endTime - metrics.startTime;

      // Calculate final statistics
      let completedNodes = 0;
      let totalNodes = 0;

      metrics.stepMetrics.forEach((stepMetric) => {
        completedNodes += stepMetric.completedNodes;
        totalNodes += stepMetric.totalNodes;
      });

      metrics.successRate = (completedNodes / totalNodes) * 100;

      const report = await this.generateStructuredReport(
        sequenceId,
        projectUUID,
      );
      // log the event
      await ProjectEventLogger.getInstance().logEvent({
        timestamp: report.metadata.timestamp,
        projectId: report.metadata.projectId,
        eventId: `build-${report.metadata.sequenceId}`,
        type: 'BUILD_METRICS',
        data: report,
      });
    }
  }

  // Utility methods
  private getOrCreateNodeMetrics(
    nodeId: string,
    sequenceId: string,
    stepId: string,
  ): NodeMetrics {
    const stepMetrics = this.getOrCreateStepMetrics(stepId, sequenceId);
    if (!stepMetrics.nodeMetrics.has(nodeId)) {
      stepMetrics.nodeMetrics.set(nodeId, {
        nodeId,
        startTime: 0,
        endTime: 0,
        duration: 0,
        status: 'pending',
        retryCount: 0,
      });
    }
    return stepMetrics.nodeMetrics.get(nodeId)!;
  }

  private getOrCreateStepMetrics(
    stepId: string,
    sequenceId: string,
  ): StepMetrics {
    const sequenceMetrics = this.sequenceMetrics.get(sequenceId);
    if (!sequenceMetrics) {
      throw new Error(`No metrics found for sequence ${sequenceId}`);
    }

    if (!sequenceMetrics.stepMetrics.has(stepId)) {
      sequenceMetrics.stepMetrics.set(stepId, {
        stepId,
        startTime: 0,
        endTime: 0,
        duration: 0,
        nodeMetrics: new Map(),
        parallel: false,
        totalNodes: 0,
        completedNodes: 0,
        failedNodes: 0,
      });
    }
    return sequenceMetrics.stepMetrics.get(stepId)!;
  }

  private getStepMetrics(
    sequenceId: string,
    stepId: string,
  ): StepMetrics | undefined {
    return this.sequenceMetrics.get(sequenceId)?.stepMetrics.get(stepId);
  }

  // Reporting methods
  getSequenceMetrics(sequenceId: string): SequenceMetrics | undefined {
    return this.sequenceMetrics.get(sequenceId);
  }

  /**
   * Return a structured report for a sequence
   * @param sequenceId sequenceId
   * @param projectUUID unique identifier for the project
   * @returns BuildReport
   */
  async generateStructuredReport(
    sequenceId: string,
    projectUUID: string,
  ): Promise<BuildReport> {
    const metrics = this.getSequenceMetrics(sequenceId);
    if (!metrics) {
      throw new Error(`No metrics found for sequence ${sequenceId}`);
    }

    let totalCompletedNodes = 0;
    let totalFailedNodes = 0;

    const steps = Array.from(metrics.stepMetrics.entries()).map(
      ([stepId, stepMetric]) => {
        const nodes = Array.from(stepMetric.nodeMetrics.entries()).map(
          ([nodeId, nodeMetric]) => {
            const values = BuildMonitor.timeRecorders.get(nodeId);
            return {
              id: nodeId,
              name: nodeId,
              duration: nodeMetric.duration,
              status: nodeMetric.status,
              retryCount: nodeMetric.retryCount,
              clock: values,
              error: nodeMetric.error
                ? {
                    message: nodeMetric.error.message,
                    stack: nodeMetric.error.stack,
                  }
                : undefined,
            };
          },
        );

        const completed = nodes.filter((n) => n.status === 'completed').length;
        const failed = nodes.filter((n) => n.status === 'failed').length;

        totalCompletedNodes += completed;
        totalFailedNodes += failed;

        return {
          id: stepId,
          name: stepId,
          duration: stepMetric.duration,
          parallel: stepMetric.parallel,
          status: (failed > 0 ? 'failed' : 'completed') as
            | 'completed'
            | 'failed',
          nodesTotal: stepMetric.totalNodes,
          nodesCompleted: completed,
          nodesFailed: failed,
          nodes,
        };
      },
    );

    const report: BuildReport = {
      metadata: {
        projectId: projectUUID,
        sequenceId: metrics.sequenceId,
        timestamp: new Date().toISOString(),
        duration: metrics.duration,
      },
      summary: {
        spendTime: Array.from(BuildMonitor.timeRecorders.entries()).map(
          ([id, time]) => `Step ${id} duration is ${time} ms`,
        ),
        totalSteps: metrics.totalSteps,
        completedSteps: steps.filter((s) => s.status === 'completed').length,
        failedSteps: steps.filter((s) => s.status === 'failed').length,
        totalNodes: metrics.totalNodes,
        completedNodes: totalCompletedNodes,
        failedNodes: totalFailedNodes,
        successRate: (totalCompletedNodes / metrics.totalNodes) * 100,
      },
      steps,
    };

    return report;
  }

  /**
   * Get Report for a sequence as string, using for test
   * @param sequenceId sequenceId
   * @returns string report
   */
  public generateTextReport(sequenceId: string): string {
    const metrics = this.getSequenceMetrics(sequenceId);
    if (!metrics) {
      return `No metrics found for sequence ${sequenceId}`;
    }

    let report = `Build Sequence Report: ${sequenceId}\n`;
    report += `====================================\n`;
    report += `Total Duration: ${metrics.duration}ms\n`;
    report += `Success Rate: ${metrics.successRate.toFixed(2)}%\n`;
    report += `Total Steps: ${metrics.totalSteps}\n`;
    report += `Total Nodes: ${metrics.totalNodes}\n\n`;

    metrics.stepMetrics.forEach((stepMetric, stepId) => {
      report += `Step: ${stepId}\n`;
      report += `  Duration: ${stepMetric.duration}ms\n`;
      report += `  Parallel: ${stepMetric.parallel}\n`;
      report += `  Completed Nodes: ${stepMetric.completedNodes}/${stepMetric.totalNodes}\n`;
      report += `  Failed Nodes: ${stepMetric.failedNodes}\n\n`;

      stepMetric.nodeMetrics.forEach((nodeMetric, nodeId) => {
        report += `    Node: ${nodeId}\n`;
        report += `      Status: ${nodeMetric.status}\n`;
        report += `      Duration: ${nodeMetric.duration}ms\n`;
        report += `      Retries: ${nodeMetric.retryCount}\n`;
        const values = BuildMonitor.timeRecorders.get(nodeId);
        if (values) {
          report += `       Clock:\n`;
          values.forEach((value) => {
            report += `          ${value.step}:\n`;
            report += `             input token: ${value.input}\n`;
            report += `             output token: ${value.output}\n`;
            report += `             GenerationDuration: ${value.generateDuration}ms\n`;
          });
        }

        if (nodeMetric.error) {
          report += `      Error: ${nodeMetric.error.message}\n`;
        }
        report += '\n';
      });
    });

    return report;
  }

  private currentStep: BuildStep | null = null;

  setCurrentStep(step: BuildStep): void {
    this.currentStep = step;
  }

  getCurrentStep(): BuildStep {
    if (!this.currentStep) {
      throw new Error('No current step set');
    }
    return this.currentStep;
  }
}
