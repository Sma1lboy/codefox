import * as fs from 'fs-extra';
import * as path from 'path';
import { FileGeneratorHandler } from '../node/file-generate';
import { VirtualDirectory } from '../node/file-generate/Virtual-Directory';

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
      virtualDir = new VirtualDirectory(structMarkdownContent);
    });

    it('should print tree structure', () => {
      const files = virtualDir.getAllFiles();
      console.log(files);
    });

    it('should validate existing files', () => {
      expect(
        virtualDir.isValidFile('src/components/common/Button/index.tsx'),
      ).toBeTruthy();
      expect(
        virtualDir.isValidFile('components/common/Button/index.tsx'),
      ).toBeFalsy();
      expect(
        virtualDir.isValidFile('src/components/layout/Sidebar/index.css'),
      ).toBeTruthy();
      expect(
        virtualDir.isValidFile('components/layout/Sidebar/index.tsx'),
      ).toBeFalsy();
      expect(virtualDir.isValidFile('nonexistent.ts')).toBeFalsy();
    });

    it('should validate existing directories', () => {
      expect(virtualDir.isValidDirectory('src')).toBeTruthy();
      expect(virtualDir.isValidDirectory('src/components/common')).toBeTruthy();
      expect(virtualDir.isValidDirectory('api')).toBeFalsy();
      expect(virtualDir.isValidDirectory('nonexistent')).toBeFalsy();
    });

    // it('should resolve relative paths correctly', () => {
    //   const resolved = virtualDir.resolveRelativePath(
    //     'components/common/Button/index.tsx',
    //     '../Input/index.tsx',
    //   );
    //   expect(virtualDir.isValidFile(resolved)).toBeTruthy();
    //   expect(resolved).toBe('components/common/Input/index.tsx');
    // });
  });
});
