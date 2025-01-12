import * as pathUtil from '../../config/common-path';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import {
  getRootDir,
  getProjectsDir,
  getProjectPath,
} from 'src/config/common-path';
import { Logger } from '@nestjs/common';

describe('Path Utilities', () => {
  const cleanUp = () => {
    // if (existsSync(ROOT_DIR)) {
    //   rmdirSync(ROOT_DIR, { recursive: true });
    // }
  };

  beforeEach(() => {
    cleanUp();
  });

  afterAll(() => {
    cleanUp();
  });

  it('should return a valid root directory', () => {
    const rootDir = getRootDir();
    expect(rootDir).toBeDefined();
    expect(rootDir).toContain('.codefox');
  });

  it('should return a valid projects directory', () => {
    const projectsDir = getProjectsDir();
    expect(projectsDir).toBeDefined();
    expect(projectsDir).toContain('projects');
  });

  it('should return a valid project path for a given ID', () => {
    const projectId = 'test-project';
    const projectPath = getProjectPath(projectId);
    expect(projectPath).toBeDefined();
    expect(projectPath).toContain(projectId);
  });

  it('should resolve paths correctly', () => {
    const rootDir = pathUtil.getRootDir();
    const projectsDir = pathUtil.getProjectsDir();
    expect(rootDir).toBeDefined();
    expect(projectsDir).toBeDefined();
  });

  it('should create and return the root directory', async () => {
    await generateAndSaveCode();
  });
});

async function generateAndSaveCode() {
  const generatedCode = `
    import { Controller, Get } from '@nestjs/common';

    @Controller('example')
    export class ExampleController {
      @Get()
      getHello(): string {
        return 'Hello World!';
      }
    }
  `;

  const fileName = 'example.controller.ts';

  try {
    const filePath = await saveGeneratedCode(fileName, generatedCode);
    // TODO: need to remove
    Logger.log(`Generated code saved at: ${filePath}`);
  } catch (error) {
    Logger.error('Failed to save generated code:', error);
  }
}
