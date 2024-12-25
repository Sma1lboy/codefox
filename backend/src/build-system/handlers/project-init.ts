import { BuilderContext } from '../context';
import { BuildHandlerManager } from '../hanlder-manager';
import { BuildHandler, BuildResult } from '../types';
import { Logger } from '@nestjs/common';

export class ProjectInitHandler implements BuildHandler {
  readonly id = 'op:PROJECT::STATE:SETUP';
  private readonly logger = new Logger('ProjectInitHandler');

  async run(context: BuilderContext): Promise<BuildResult> {
    this.logger.log('Setting up project...');

    const result = {
      projectName: 'online shoping',
      descreption: 'sell products',
      Platform: 'Web',
      path: '/path/to/project',
    };
    context.setGlobalContext('projectConfig', result);

    return {
      success: true,
      data: result,
    };
  }
}
