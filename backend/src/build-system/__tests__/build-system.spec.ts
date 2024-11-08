// project-init-sequence.test.ts

import { BuilderContext } from '../context';
import { BuildSequenceExecutor } from '../executor';
import { BuildSequence } from '../types';

describe('Project Init Sequence Test', () => {
  const projectInitSequence: BuildSequence = {
    id: 'seq:project:init:v1',
    version: '1.0',
    name: 'Project Initialization Sequence',
    description:
      'User creates project with initial set of details{}, builds different layers until app generated',
    steps: [
      {
        id: 'step1',
        name: 'Project Setup',
        parallel: false,
        nodes: [
          {
            id: 'op:PROJECT::STATE:SETUP',
            type: 'PROJECT_SETUP',
            name: 'Project Setup',
          },
        ],
      },
      {
        id: 'step2',
        name: 'Initial Requirements Analysis',
        parallel: true,
        nodes: [
          {
            id: 'PM:PRD::ANALYSIS',
            type: 'ANALYSIS',
            name: 'Product Requirements Analysis',
            requires: ['op:PROJECT::STATE:SETUP'],
          },
          {
            id: 'PM:FRD::ANALYSIS',
            type: 'ANALYSIS',
            name: 'Functional Requirements Analysis',
            requires: ['PM:PRD::ANALYSIS'],
          },
          {
            id: 'PM:DRD::ANALYSIS',
            type: 'ANALYSIS',
            name: 'Detailed Requirements Analysis',
            requires: ['PM:FRD::ANALYSIS'],
          },
          {
            id: 'PM:UXSMD::ANALYSIS',
            type: 'ANALYSIS',
            name: 'UX System Mapping Analysis',
            requires: ['PM:FRD::ANALYSIS'],
          },
        ],
      },
      {
        id: 'step3',
        name: 'Database Layer',
        parallel: true,
        nodes: [
          {
            id: 'DB:SCHEMAS::GENERATE',
            type: 'DATABASE',
            name: 'Database Schema Generation',
            requires: ['PM:DRD::ANALYSIS'],
          },
          {
            id: 'DB:POSTGRES::GENERATE',
            type: 'DATABASE',
            name: 'PostgreSQL Database Generation',
            requires: ['DB:SCHEMAS::GENERATE'],
          },
        ],
      },
      {
        id: 'step4',
        name: 'Business Requirements',
        parallel: false,
        nodes: [
          {
            id: 'PM:BRD::ANALYSIS',
            type: 'ANALYSIS',
            name: 'Business Requirements Analysis',
            requires: ['DB:POSTGRES::GENERATE'],
          },
        ],
      },
      {
        id: 'step5',
        name: 'Backend Layer',
        parallel: true,
        nodes: [
          {
            id: 'BACKEND:OPENAPI::DEFINE',
            type: 'BACKEND',
            name: 'OpenAPI Definition',
            requires: ['PM:BRD::ANALYSIS'],
          },
          {
            id: 'BACKEND:ASYNCAPI::DEFINE',
            type: 'BACKEND',
            name: 'AsyncAPI Definition',
            requires: ['PM:BRD::ANALYSIS'],
          },
          {
            id: 'BACKEND:SERVER::GENERATE',
            type: 'BACKEND',
            name: 'Server Generation',
            requires: ['BACKEND:OPENAPI::DEFINE', 'BACKEND:ASYNCAPI::DEFINE'],
          },
        ],
      },
      {
        id: 'step6',
        name: 'UX Analysis and Design',
        parallel: true,
        nodes: [
          {
            id: 'PM:UXDMD::ANALYSIS',
            type: 'ANALYSIS',
            name: 'UX Detailed Mapping Analysis',
            requires: ['PM:UXSMD::ANALYSIS', 'BACKEND:SERVER::GENERATE'],
          },
          {
            id: 'UX:SITEMAP::STRUCTURE',
            type: 'UX',
            name: 'Sitemap Structure',
            requires: ['PM:UXSMD::ANALYSIS'],
          },
          {
            id: 'UX:DATAMAP::STRUCTURE',
            type: 'UX',
            name: 'Datamap Structure',
            requires: ['PM:UXDMD::ANALYSIS'],
          },
          {
            id: 'UX:DATAMAP::VIEWS',
            type: 'UX',
            name: 'Datamap Views',
            requires: ['UX:SITEMAP::STRUCTURE', 'UX:DATAMAP::STRUCTURE'],
          },
        ],
      },
      {
        id: 'step7',
        name: 'WebApp Generation',
        parallel: true,
        nodes: [
          {
            id: 'WEBAPP:STORE::GENERATE',
            type: 'WEBAPP',
            name: 'Store Generation',
            requires: ['UX:DATAMAP::VIEWS'],
          },
          {
            id: 'WEBAPP:ROOT::GENERATE',
            type: 'WEBAPP',
            name: 'Root Component Generation',
            requires: ['WEBAPP:STORE::GENERATE'],
          },
          {
            id: 'WEBAPP:VIEW::GENERATE:MULTI',
            type: 'WEBAPP',
            name: 'Multi-View Generation',
            requires: ['WEBAPP:ROOT::GENERATE'],
          },
        ],
      },
    ],
  };

  test('should execute project init sequence correctly', async () => {
    const executedNodes: string[] = [];
    const context = new BuilderContext(projectInitSequence);

    context.run = jest.fn().mockImplementation(async (nodeId: string) => {
      executedNodes.push(nodeId);
      return { success: true };
    });

    const executor = new BuildSequenceExecutor(context);
    await executor.executeSequence(projectInitSequence);

    const setupIndex = executedNodes.indexOf('op:PROJECT::STATE:SETUP');
    const prdIndex = executedNodes.indexOf('PM:PRD::ANALYSIS');
    const serverGenIndex = executedNodes.indexOf('BACKEND:SERVER::GENERATE');
    const finalViewIndex = executedNodes.indexOf('WEBAPP:VIEW::GENERATE:MULTI');

    expect(setupIndex).toBe(0);
    expect(prdIndex).toBeGreaterThan(setupIndex);
    expect(serverGenIndex).toBeGreaterThan(prdIndex);
    expect(finalViewIndex).toBe(executedNodes.length - 1);
    expect(executedNodes.indexOf('PM:FRD::ANALYSIS')).toBeGreaterThan(
      executedNodes.indexOf('PM:PRD::ANALYSIS'),
    );
    expect(executedNodes.indexOf('DB:POSTGRES::GENERATE')).toBeGreaterThan(
      executedNodes.indexOf('DB:SCHEMAS::GENERATE'),
    );
    expect(executedNodes.indexOf('WEBAPP:ROOT::GENERATE')).toBeGreaterThan(
      executedNodes.indexOf('WEBAPP:STORE::GENERATE'),
    );

    const allNodes = projectInitSequence.steps.flatMap((step) =>
      step.nodes.map((node) => node.id),
    );
    allNodes.forEach((nodeId) => {
      expect(executedNodes).toContain(nodeId);
    });

    const state = context.getState();
    allNodes.forEach((nodeId) => {
      expect(state.completed.has(nodeId)).toBe(true);
    });
  });
});
