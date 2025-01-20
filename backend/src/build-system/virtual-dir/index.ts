import { Logger } from '@nestjs/common';
import normalizePath from 'normalize-path';
import * as path from 'path';

interface VirtualNode {
  name: string;
  isFile: boolean;
  children: Map<string, VirtualNode>;
}

interface FileStructureNode {
  type: 'file' | 'directory';
  name: string;
  children?: FileStructureNode[];
}

export class VirtualDirectory {
  private root: VirtualNode;

  constructor() {
    this.root = {
      name: 'src',
      isFile: false,
      children: new Map(),
    };
  }

  private cleanJsonContent(content: string): string {
    const jsonStart = content.indexOf('{');
    const jsonEnd = content.lastIndexOf('}');
    return content.slice(jsonStart, jsonEnd + 1);
  }

  public parseJsonStructure(jsonContent: string): boolean {
    try {
      const cleanedJson = this.cleanJsonContent(jsonContent);
      const structure = JSON.parse(cleanedJson);
      this.buildTree(structure, this.root);
      return true;
    } catch (error) {
      Logger.error('Failed to parse JSON structure:', error);
      return false;
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

  public isValidFile(filePath: string): boolean {
    const node = this.findNode(filePath);
    return node?.isFile ?? false;
  }

  isValidDirectory(dirPath: string): boolean {
    const node = this.findNode(dirPath);
    return node !== null && !node.isFile;
  }

  // private findNode(inputPath: string): VirtualNode | null {
  //   const normalizedPath = this.normalizePath(inputPath);
  //   const parts = normalizedPath.split('/').filter(Boolean);

  //   if (parts[0] !== 'src') {
  //     return null;
  //   }

  //   let current = this.root;
  //   for (let i = 1; i < parts.length; i++) {
  //     const next = current.children.get(parts[i]);
  //     if (!next) return null;
  //     current = next;
  //   }
  //   return current;
  // }

  private findNode(inputPath: string): VirtualNode | null {
    const normalizedPath = this.normalizePath(inputPath);
    const parts = normalizedPath.split('/').filter(Boolean);

    // // If the path starts with 'src', remove that segment
    // if (parts[0] === 'src') {
    //   parts.shift(); // Remove the 'src' segment
    // }
    if (parts.length === 0) {
      return null;
    }

    // Ensure consistent handling by always requiring 'src' prefix
    if (parts[0] !== 'src') {
      return null;
    }

    parts.shift();

    let current = this.root;
    for (const part of parts) {
      const next = current.children.get(part);
      if (!next) return null;
      current = next;
    }
    return current;
  }

  private normalizePath(inputPath: string): string {
    return normalizePath(inputPath);
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
