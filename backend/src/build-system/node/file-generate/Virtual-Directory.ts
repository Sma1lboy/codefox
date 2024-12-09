import * as path from 'path';

interface VirtualNode {
  name: string;
  isFile: boolean;
  children: Map<string, VirtualNode>;
}

export class VirtualDirectory {
  private root: VirtualNode;

  constructor(jsonStructure: string) {
    this.root = {
      name: 'src',
      isFile: false,
      children: new Map(),
    };
    this.parseJsonStructure(jsonStructure);
  }

  private cleanJsonContent(content: string): string {
    const jsonStart = content.indexOf('{');
    return content.slice(jsonStart);
  }

  private parseJsonStructure(jsonContent: string): void {
    try {
      const cleanedJson = this.cleanJsonContent(jsonContent);
      const structure = JSON.parse(cleanedJson);
      this.buildTree(structure, this.root);
    } catch (error) {
      console.error('Failed to parse JSON structure:', error);
    }
  }

  private buildTree(node: FileStructureNode, virtualNode: VirtualNode): void {
    if (node.children) {
      for (const child of node.children) {
        const newNode: VirtualNode = {
          name: child.name,
          isFile: child.type === 'file',
          children: new Map(),
        };
        virtualNode.children.set(child.name, newNode);

        if (child.type === 'directory' && child.children) {
          this.buildTree(child, newNode);
        }
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
          files.push(`src/${currentPath}`);
        }
        traverse(child, currentPath);
      }
    };

    traverse(this.root);
    return files.sort();
  }
}
