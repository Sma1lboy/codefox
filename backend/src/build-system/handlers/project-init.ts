import { BuilderContext } from '../context';
import { BuildHandlerManager } from '../hanlder-manager';
import { BuildHandler, BuildResult } from '../types';

export class ProjectInitHandler implements BuildHandler {
  readonly id = 'op:PROJECT::STATE:SETUP';

  async run(context: BuilderContext): Promise<BuildResult> {
    console.log('Setting up project...');
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
