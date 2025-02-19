import { Logger } from '@nestjs/common';
import { BuildSequence } from './types';
import { ProjectEventLogger } from './logger';
import { OpenAIModelProvider } from 'src/common/model-provider/openai-model-provider';
import * as gpt3Encoder from 'gpt-3-encoder';
/**
 * Node execution metrics
 */
export interface NodeMetrics {
  nodeId: string;
  startTime: number;
  endTime: number;
  duration: number;
  status: 'completed' | 'failed' | 'pending';
  retryCount: number;
  error?: Error;
}

/**
 * Sequence execution metrics
 */
export interface SequenceMetrics {
  sequenceId: string;
  startTime: number;
  endTime: number;
  duration: number;
  nodeMetrics: Map<string, NodeMetrics>;
  nodesOrder: string[];
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  successRate: number;
}

/**
 * Build execution report structure
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
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    successRate: number;
  };
  nodes: Array<{
    id: string;
    name: string;
    duration: number;
    status: 'completed' | 'failed' | 'pending';
    retryCount: number;
    clock?: any[];
    error?: {
      message: string;
      stack?: string;
    };
  }>;
}

export class BuildMonitor {
  private static instance: BuildMonitor;
  private logger: Logger;
  private sequenceMetrics: Map<string, SequenceMetrics> = new Map();
  private timeRecorders: Map<string, any[]> = new Map();
  private model = OpenAIModelProvider.getInstance();

  private constructor() {
    this.logger = new Logger('BuildMonitor');
  }

  static getInstance(): BuildMonitor {
    if (!BuildMonitor.instance) {
      BuildMonitor.instance = new BuildMonitor();
    }
    return BuildMonitor.instance;
  }

  public async timeRecorder(
    generateDuration: number,
    name: string,
    step: string,
    input: string,
    output: string,
  ): Promise<void> {
    const inputLength = input.length;
    const value = {
      step,
      input: inputLength,
      output: gpt3Encoder.encode(output).length,
      generateDuration,
    };
    if (!this.timeRecorders.has(name)) {
      this.timeRecorders.set(name, []);
    }
    this.timeRecorders.get(name)!.push(value);
  }

  // Node-level monitoring
  startNodeExecution(nodeId: string, sequenceId: string): void {
    let sequenceMetrics = this.sequenceMetrics.get(sequenceId);

    // Create sequence metrics if not exists
    if (!sequenceMetrics) {
      sequenceMetrics = {
        sequenceId,
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        nodeMetrics: new Map(),
        nodesOrder: [],
        totalNodes: 0, // Will be updated when we know the total
        completedNodes: 0,
        failedNodes: 0,
        successRate: 0,
      };
      this.sequenceMetrics.set(sequenceId, sequenceMetrics);
    }

    // Create or get node metrics
    if (!sequenceMetrics.nodeMetrics.has(nodeId)) {
      sequenceMetrics.nodeMetrics.set(nodeId, {
        nodeId,
        startTime: Date.now(),
        endTime: 0,
        duration: 0,
        status: 'pending',
        retryCount: 0,
      });
      // Update total nodes count
      sequenceMetrics.totalNodes++;
    }

    const nodeMetrics = sequenceMetrics.nodeMetrics.get(nodeId)!;
    nodeMetrics.startTime = Date.now();
    nodeMetrics.status = 'pending';

    // Add node to execution order if not already present
    if (!sequenceMetrics.nodesOrder.includes(nodeId)) {
      sequenceMetrics.nodesOrder.push(nodeId);
    }
  }

  endNodeExecution(
    nodeId: string,
    sequenceId: string,
    success: boolean,
    error?: Error,
  ): void {
    let sequenceMetrics = this.sequenceMetrics.get(sequenceId);

    // Create sequence metrics if not exists
    if (!sequenceMetrics) {
      this.startNodeExecution(nodeId, sequenceId);
      sequenceMetrics = this.sequenceMetrics.get(sequenceId)!;
    }

    const nodeMetrics = sequenceMetrics.nodeMetrics.get(nodeId);
    if (!nodeMetrics) {
      // Create node metrics if not exists
      sequenceMetrics.nodeMetrics.set(nodeId, {
        nodeId,
        startTime: Date.now() - 1, // Set a minimal duration
        endTime: Date.now(),
        duration: 1,
        status: success ? 'completed' : 'failed',
        retryCount: 0,
        error: error,
      });
      sequenceMetrics.totalNodes++;
      if (!sequenceMetrics.nodesOrder.includes(nodeId)) {
        sequenceMetrics.nodesOrder.push(nodeId);
      }
    } else {
      nodeMetrics.endTime = Date.now();
      nodeMetrics.duration = nodeMetrics.endTime - nodeMetrics.startTime;
      nodeMetrics.status = success ? 'completed' : 'failed';
      if (error) {
        nodeMetrics.error = error;
      }
    }

    // Update sequence metrics
    this.updateSequenceMetrics(sequenceId);
  }

  incrementNodeRetry(nodeId: string, sequenceId: string): void {
    let sequenceMetrics = this.sequenceMetrics.get(sequenceId);

    // Create sequence metrics if not exists
    if (!sequenceMetrics) {
      this.startNodeExecution(nodeId, sequenceId);
      sequenceMetrics = this.sequenceMetrics.get(sequenceId)!;
    }

    let nodeMetrics = sequenceMetrics.nodeMetrics.get(nodeId);
    if (!nodeMetrics) {
      // Create node metrics if not exists
      this.startNodeExecution(nodeId, sequenceId);
      nodeMetrics = sequenceMetrics.nodeMetrics.get(nodeId)!;
    }

    nodeMetrics.retryCount++;
  }

  // Sequence-level monitoring
  startSequenceExecution(sequence: BuildSequence): void {
    const metrics: SequenceMetrics = {
      sequenceId: sequence.id,
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      nodeMetrics: new Map(),
      nodesOrder: [],
      totalNodes: sequence.nodes.length,
      completedNodes: 0,
      failedNodes: 0,
      successRate: 0,
    };
    this.sequenceMetrics.set(sequence.id, metrics);
  }

  async endSequenceExecution(
    sequenceId: string,
    projectUUID: string,
  ): Promise<void> {
    const metrics = this.sequenceMetrics.get(sequenceId);
    if (!metrics) {
      throw new Error(`No metrics found for sequence ${sequenceId}`);
    }

    metrics.endTime = Date.now();
    metrics.duration = metrics.endTime - metrics.startTime;

    this.updateSequenceMetrics(sequenceId);

    // Generate and log the report
    const report = await this.generateStructuredReport(sequenceId, projectUUID);
    await ProjectEventLogger.getInstance().logEvent({
      timestamp: report.metadata.timestamp,
      projectId: report.metadata.projectId,
      eventId: `build-${report.metadata.sequenceId}`,
      type: 'BUILD_METRICS',
      data: report,
    });

    // Clean up sequence metrics and time recorders after logging
    this.sequenceMetrics.delete(sequenceId);
    metrics.nodesOrder.forEach((nodeId) => {
      this.timeRecorders.delete(nodeId);
    });
  }

  private updateSequenceMetrics(sequenceId: string): void {
    const metrics = this.sequenceMetrics.get(sequenceId);
    if (metrics) {
      metrics.completedNodes = Array.from(metrics.nodeMetrics.values()).filter(
        (n) => n.status === 'completed',
      ).length;
      metrics.failedNodes = Array.from(metrics.nodeMetrics.values()).filter(
        (n) => n.status === 'failed',
      ).length;
      metrics.successRate = (metrics.completedNodes / metrics.totalNodes) * 100;
    }
  }

  async generateStructuredReport(
    sequenceId: string,
    projectUUID: string,
  ): Promise<BuildReport> {
    const metrics = this.sequenceMetrics.get(sequenceId);
    if (!metrics) {
      throw new Error(`No metrics found for sequence ${sequenceId}`);
    }

    const nodes = metrics.nodesOrder
      .map((nodeId) => {
        const nodeMetric = metrics.nodeMetrics.get(nodeId);
        if (!nodeMetric) return null;

        const values = this.timeRecorders.get(nodeId);
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
      })
      .filter(Boolean);

    return {
      metadata: {
        projectId: projectUUID,
        sequenceId: metrics.sequenceId,
        timestamp: new Date().toISOString(),
        duration: metrics.duration,
      },
      summary: {
        spendTime: Array.from(this.timeRecorders.entries()).map(
          ([id, time]) => `Node ${id} duration is ${time} ms`,
        ),
        totalNodes: metrics.totalNodes,
        completedNodes: metrics.completedNodes,
        failedNodes: metrics.failedNodes,
        successRate: metrics.successRate,
      },
      nodes,
    };
  }

  generateTextReport(sequenceId: string): string {
    const metrics = this.sequenceMetrics.get(sequenceId);
    if (!metrics) {
      return `No metrics found for sequence ${sequenceId}`;
    }

    let report = `Build Sequence Report: ${sequenceId}\n`;
    report += `====================================\n`;
    report += `Total Duration: ${metrics.duration}ms\n`;
    report += `Success Rate: ${metrics.successRate.toFixed(2)}%\n`;
    report += `Total Nodes: ${metrics.totalNodes}\n`;
    report += `Completed/Failed: ${metrics.completedNodes}/${metrics.failedNodes}\n\n`;

    metrics.nodesOrder.forEach((nodeId) => {
      const nodeMetric = metrics.nodeMetrics.get(nodeId);
      if (!nodeMetric) return;

      report += `Node: ${nodeId}\n`;
      report += `  Status: ${nodeMetric.status}\n`;
      report += `  Duration: ${nodeMetric.duration}ms\n`;
      report += `  Retries: ${nodeMetric.retryCount}\n`;

      const values = this.timeRecorders.get(nodeId);
      if (values) {
        report += `  Clock:\n`;
        values.forEach((value) => {
          report += `    ${value.step}:\n`;
          report += `      Input Token: ${value.input}\n`;
          report += `      Output Token: ${value.output}\n`;
          report += `      Generation Duration: ${value.generateDuration}ms\n`;
        });
      }

      if (nodeMetric.error) {
        report += `  Error: ${nodeMetric.error.message}\n`;
      }
      report += '\n';
    });

    return report;
  }
  /**
   * Get metrics for a specific sequence
   * @param sequenceId The ID of the sequence
   * @returns The metrics for the sequence, or undefined if not found
   */
  getSequenceMetrics(sequenceId: string): SequenceMetrics | undefined {
    return this.sequenceMetrics.get(sequenceId);
  }
}
