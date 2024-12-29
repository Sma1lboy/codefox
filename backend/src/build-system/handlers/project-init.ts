import { BuilderContext } from '../context';
import { BuildHandler, BuildResult } from '../types';
import { Logger } from '@nestjs/common';
import { buildProjectPath, copyProjectTemplate } from '../utils/files';
export class ProjectInitHandler implements BuildHandler {
  readonly id = 'op:PROJECT::STATE:SETUP';
  private readonly logger = new Logger('ProjectInitHandler');

  async run(context: BuilderContext): Promise<BuildResult> {
    this.logger.log('Setting up project...');

    // setup project workspaces
    const uuid = context.getGlobalContext('projectUUID');
    // FIXME: default convention of frontend and backend folders

    copyProjectTemplate('../../../template/react-ts', uuid, 'frontend');
    copyProjectTemplate('../../../template/template-backend', uuid, 'backend');
    context.setGlobalContext(
      'frontendPath',
      buildProjectPath(uuid, 'frontend'),
    );
    context.setGlobalContext('backendPath', buildProjectPath(uuid, 'backend'));
    // TODO: setup allInOne, frontend-backend, etc
    context.setGlobalContext('projectStructure', 'frontend-backend');
    // TODO: setup project path
    /*
    if (projectStructure === 'frontend-backend') {
      // setup frontend and backend folders
      copyProjectTemplate('../../../template/react-ts', uuid, 'frontend');
      copyProjectTemplate('../../../template/template-backend', uuid, 'backend');
          context.setGlobalContext(
      'frontendPath',
      path.join(getProjectsDir(), uuid, 'frontend'),
    );
    context.setGlobalContext(
      'backendPath',
      path.join(getProjectsDir(), uuid, 'backend'),
    );
    } else if (projectStructure === 'allInOne') {
      // setup all in one folder
      copyProjectTemplate('../../../template/allInOne', uuid);
          context.setGlobalContext(
      'frontendPath',
      path.join(getProjectsDir(), uuid),
    );
    context.setGlobalContext(
      'backendPath',
      path.join(getProjectsDir(), uuid),
    );

  }

    */

    return {
      success: true,
      data: 'Project setup completed successfully',
    };
  }
}
