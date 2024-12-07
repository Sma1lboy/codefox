import * as path from 'path';

interface VirtualNode {
  name: string;
  isFile: boolean;
  children: Map<string, VirtualNode>;
}

export class VirtualDirectory {
  private root: VirtualNode;

  constructor(structureMarkdown: string) {
    this.root = {
      name: 'src',
      isFile: false,
      children: new Map(),
    };
    this.parseMarkdownStructure(structureMarkdown);
  }

  private parseMarkdownStructure(markdownContent: string): void {
    const lines = markdownContent.split('\n');
    const currentPath: VirtualNode[] = [this.root];
    const lastItemAtLevel: { [level: number]: boolean } = {};

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('FolderStructure')) continue;

      line = line.split('#')[0].trim();
      if (!line) continue;

      const match = line.match(/^([\s│]*)([├└])──\s*(.+)$/);
      if (!match) continue;

      const prefix = match[1];
      const isLastItem = match[2] === '└';
      const afterBranch = match[3].trim();

      if (!afterBranch || afterBranch === 'src/') continue;

      // Count vertical bars, accounting for spaces where last items were
      const level = prefix.split('').reduce((count, char, index) => {
        if (
          char === '│' ||
          (char === ' ' && lastItemAtLevel[Math.floor(index / 4)])
        ) {
          return count + (index % 4 === 0 ? 1 : 0);
        }
        return count;
      }, 0);

      // Update last item tracking
      lastItemAtLevel[level] = isLastItem;

      const cleanName = afterBranch.replace(/\/$/, '');
      const isFile = path.extname(cleanName).length > 0;

      while (currentPath.length > level + 1) {
        currentPath.pop();
      }

      const newNode: VirtualNode = {
        name: cleanName,
        isFile,
        children: new Map(),
      };

      const parent = currentPath[currentPath.length - 1];
      parent.children.set(cleanName, newNode);

      if (!isFile) {
        currentPath.push(newNode);
      }
    }
  }

  isValidFile(filePath: string): boolean {
    const node = this.findNode(filePath);
    return node?.isFile ?? false;
  }

  isValidDirectory(dirPath: string): boolean {
    const node = this.findNode(dirPath);
    return node !== null && !node.isFile;
  }

  private findNode(inputPath: string): VirtualNode | null {
    const normalizedPath = this.normalizePath(inputPath);
    const parts = normalizedPath.split('/').filter(Boolean);

    // Require src prefix
    if (parts[0] !== 'src') {
      return null;
    }

    let current = this.root;
    for (let i = 1; i < parts.length; i++) {
      const next = current.children.get(parts[i]);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  private normalizePath(inputPath: string): string {
    return path.normalize(inputPath).replace(/\\/g, '/').replace(/\/$/, '');
  }
  resolveRelativePath(fromFile: string, toPath: string): string {
    const fromDir = path.dirname(fromFile);
    const resolvedPath = path.join(fromDir, toPath).replace(/\\/g, '/');
    return this.normalizePath(resolvedPath);
  }

  getAllFiles(): string[] {
    const files: string[] = [];

    const traverse = (node: VirtualNode, parentPath: string = '') => {
      for (const [name, child] of node.children) {
        const currentPath = parentPath ? `${parentPath}/${name}` : name;
        if (child.isFile) {
          files.push(`src/${currentPath}`); // Prepend 'src/' to match the full path
        }
        traverse(child, currentPath);
      }
    };

    traverse(this.root);
    return files.sort();
  }
}
