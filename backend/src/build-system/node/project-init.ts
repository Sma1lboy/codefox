import { BuildHandlerManager } from '../hanlder-manager';

const manager = BuildHandlerManager.getInstance();

//TODO
manager.register('op:PROJECT::STATE:SETUP', async (context) => {
  console.log('Setting up project...');
  const result = {
    projectName: 'example',
    path: '/path/to/project',
  };
  context.setData('projectConfig', result);
  return {
    success: true,
    data: result,
  };
});
