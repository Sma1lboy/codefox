import * as babel from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { Logger } from '@nestjs/common';
import { PackageDocument } from './types';

export function getLeadingComments(node: any): string {
  if (!node.leadingComments) return '';
  return node.leadingComments.map((comment) => comment.value.trim()).join('\n');
}
export async function parseFileToDocuments(
  filePath: string,
  content: string,
  name: string,
  version: string,
): Promise<PackageDocument[]> {
  const documents: PackageDocument[] = [];

  try {
    const ast = babel.parse(content, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript', 'classProperties'],
    });

    traverse(ast, {
      FunctionDeclaration(path) {
        const functionId = path.node.id?.name || `anonymous_${path.node.start}`;
        const id = `${name}@${version}/${filePath}#function_${functionId}_${path.node.start}`;

        const doc: PackageDocument = {
          id: id,
          metadata: {
            name,
            version,
            type: 'function',
            filepath: filePath,
            exportType:
              path.parent.type === 'ExportDefaultDeclaration'
                ? 'default'
                : 'named',
            parameters: path.node.params.map((p) => (p as any).name),
            description: getLeadingComments(path.node),
          },
          content: content.slice(path.node.start, path.node.end),
        };
        documents.push(doc);
      },

      ClassDeclaration(path) {
        const doc: PackageDocument = {
          id: `${name}@${version}/${filePath}#${path.node.id?.name}`,
          metadata: {
            name,
            version,
            type: 'class',
            filepath: filePath,
            exportType:
              path.parent.type === 'ExportDefaultDeclaration'
                ? 'default'
                : 'named',
            description: getLeadingComments(path.node),
          },
          content: content.slice(path.node.start, path.node.end),
        };
        documents.push(doc);

        // Extract class methods
        path.node.body.body.forEach((member) => {
          if (t.isClassMethod(member)) {
            documents.push({
              id: `${name}@${version}/${filePath}#${path.node.id?.name}.${member.key['name']}`,
              metadata: {
                name,
                version,
                type: 'function',
                filepath: filePath,
                exportType: 'named',
                parameters: member.params.map((p) => (p as any).name),
                description: getLeadingComments(member),
              },
              content: content.slice(member.start, member.end),
            });
          }
        });
      },

      VariableDeclaration(path) {
        path.node.declarations.forEach((decl) => {
          if (t.isObjectExpression(decl.init)) {
            documents.push({
              id: `${name}@${version}/${filePath}#${(decl.id as any).name}`,
              metadata: {
                name,
                version,
                type: 'object',
                filepath: filePath,
                exportType:
                  path.parent.type === 'ExportDefaultDeclaration'
                    ? 'default'
                    : 'named',
                description: getLeadingComments(path.node),
              },
              content: content.slice(decl.start, decl.end),
            });
          }
        });
      },
    });
  } catch (error) {
    Logger.error(`Error parsing file ${filePath}:`, error);
  }

  return documents;
}
