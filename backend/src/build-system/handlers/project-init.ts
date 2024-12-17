import { BuilderContext } from '../context';
import { BuildHandlerManager } from '../hanlder-manager';
import { BuildHandler, BuildResult } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { getTemplatePath } from 'src/config/common-path';
import { copyProjectTemplate } from 'src/build-system/utils/files';

export class ProjectInitHandler implements BuildHandler {
  readonly id = 'op:PROJECT::STATE:SETUP';

  async run(context: BuilderContext): Promise<BuildResult> {
    console.log('Setting up project...');

    // copy project template
    const projectUUID = uuidv4();

    //frontend
    const frontendTemplatePath = getTemplatePath('react-ts');
    // backend
    const backendTemplatePath = getTemplatePath('template-backend');
    const backendProjectPath = await copyProjectTemplate(
      backendTemplatePath,
      projectUUID,
    );

    if (!backendProjectPath) {
      return {
        success: false,
        error: new Error('Failed to copy project template'),
      };
    }

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
