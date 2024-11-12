// src/build-system/__tests__/project-init-sequence.spec.ts
import { BuilderContext } from '../context';
import { BuildSequenceExecutor } from '../executor';
import { BuildHandlerManager } from '../hanlder-manager';
import { ProjectInitHandler } from '../node/project-init';
import { BuildSequence } from '../types';

describe('Project Init Handler Test', () => {
  let context: BuilderContext;
  let executor: BuildSequenceExecutor;
  let handlerManager: BuildHandlerManager;

  const testSequence: BuildSequence = {
    id: 'test:project-init',
    version: '1.0',
    name: 'Project Init Test',
    description: 'Test sequence for project initialization',
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
    ],
  };

  beforeEach(() => {
    handlerManager = BuildHandlerManager.getInstance();
    handlerManager.clear();

    context = new BuilderContext(testSequence);
    executor = new BuildSequenceExecutor(context);
  });

  describe('Handler Registration', () => {
    test('should register handler correctly', () => {
      const handler = handlerManager.getHandler('op:PROJECT::STATE:SETUP');
      expect(handler).toBeDefined();
      expect(handler instanceof ProjectInitHandler).toBeTruthy();
    });
  });

  describe('State Management', () => {
    test('should update execution state correctly', async () => {
      let state = context.getState();
      expect(state.completed.size).toBe(0);
      expect(state.pending.size).toBe(0);

      await executor.executeSequence(testSequence);

      state = context.getState();
      expect(state.completed.size).toBe(1);
      expect(state.completed.has('op:PROJECT::STATE:SETUP')).toBe(true);
      expect(state.pending.size).toBe(0);
      expect(state.failed.size).toBe(0);
    });
  });

  describe('Direct Handler Execution', () => {
    test('should be able to run handler directly', async () => {
      const handler = new ProjectInitHandler();
      const result = await handler.run(context);
      expect(result.success).toBe(true);
    });
  });

  describe('Handler ID', () => {
    test('should have correct handler id', () => {
      const handler = new ProjectInitHandler();
      expect(handler.id).toBe('op:PROJECT::STATE:SETUP');
    });
  });
});
