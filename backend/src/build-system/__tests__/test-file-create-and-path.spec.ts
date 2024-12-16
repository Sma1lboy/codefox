import * as path from 'path';
import * as os from 'os';
import { existsSync, rmdirSync } from 'fs-extra';
import * as pathUtil from '../../config/common-path';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import {
  getRootDir,
  getProjectsDir,
  getProjectPath,
} from 'src/config/common-path';

describe('Path Utilities', () => {
  const APP_NAME = 'codefox';
  const ROOT_DIR = path.join(os.homedir(), `.${APP_NAME}`);

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
    const rootDir = pathUtil.getRootDir();

    await generateAndSaveCode();
    expect(rootDir).toBe(ROOT_DIR);
    expect(existsSync(ROOT_DIR)).toBe(true);
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
    console.log(`Generated code saved at: ${filePath}`);
  } catch (error) {
    console.error('Failed to save generated code:', error);
  }
}
