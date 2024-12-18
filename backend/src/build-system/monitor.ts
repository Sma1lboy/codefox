import { Logger } from '@nestjs/common';
import { BuildNode, BuildStep, BuildSequence } from './types';

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
  private logger: Logger;
  private sequenceMetrics: Map<string, SequenceMetrics> = new Map();

  private constructor() {
    this.logger = new Logger('BuildMonitor');
  }

  static getInstance(): BuildMonitor {
    if (!BuildMonitor.instance) {
      BuildMonitor.instance = new BuildMonitor();
    }
    return BuildMonitor.instance;
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

  endSequenceExecution(sequenceId: string): void {
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

  generateReport(sequenceId: string): string {
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
