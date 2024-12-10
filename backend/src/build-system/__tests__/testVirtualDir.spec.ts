import * as fs from 'fs-extra';
import * as path from 'path';
import { FileGeneratorHandler } from '../node/file-generate';
import { VirtualDirectory } from '../node/file-generate/virtual-directory';

describe('FileGeneratorHandler and VirtualDirectory', () => {
  const structMdFilePath = path.resolve(
    'src\\build-system\\__tests__\\file-structure-document.md',
  );

  beforeEach(async () => {
    await fs.remove('src\\build-system\\__tests__\\test-project\\src\\');
  });

  afterEach(async () => {
    await fs.remove('src\\build-system\\__tests__\\test-project\\src\\');
  });

  describe('VirtualDirectory', () => {
    let virtualDir: VirtualDirectory;
    let structMarkdownContent: string;

    beforeEach(() => {
      structMarkdownContent = fs.readFileSync(structMdFilePath, 'utf8');
      virtualDir = new VirtualDirectory();
      virtualDir.parseJsonStructure(structMarkdownContent);
    });

    it('should print tree structure', () => {
      const files = virtualDir.getAllFiles();
      console.log(files);
    });

    // change test path to your current test file
    it('should validate existing files', () => {
      expect(virtualDir.isValidFile('src/pages/Home/index.tsx')).toBeTruthy();
      // expect(virtualDir.isValidFile('src/utils/validators.ts')).toBeTruthy();
      // expect(
      //   virtualDir.isValidFile('components/common/Button/index.tsx'),
      // ).toBeFalsy();
      // expect(
      //   virtualDir.isValidFile('src/components/layout/Footer/index.css'),
      // ).toBeTruthy();
      // expect(
      //   virtualDir.isValidFile('components/layout/Footer/index.tsx'),
      // ).toBeFalsy();
      expect(virtualDir.isValidFile('nonexistent.ts')).toBeFalsy();
    });

    it('should validate existing directories', () => {
      expect(virtualDir.isValidDirectory('src')).toBeTruthy();
      expect(virtualDir.isValidDirectory('src/components/common')).toBeTruthy();
      expect(virtualDir.isValidDirectory('api')).toBeFalsy();
      expect(virtualDir.isValidDirectory('nonexistent')).toBeFalsy();
    });

    it('should resolve relative paths correctly', () => {
      const resolved = virtualDir.resolveRelativePath(
        'src/components/common/Button/index.tsx',
        '../Loader/index.tsx',
      );
      expect(virtualDir.isValidFile(resolved)).toBeTruthy();
      expect(resolved).toBe('src/components/common/Loader/index.tsx');
    });
  });
});
