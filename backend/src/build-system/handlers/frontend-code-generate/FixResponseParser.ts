import { FileOperation } from './FileOperationManager';

export class FixResponseParser {
  private logger = console;

  // parse the gpt json input
  parse(json: string, filePath: string): FileOperation[] {
    this.logger.log('Parsing JSON:', json);

    let parsedData;
    try {
      parsedData = JSON.parse(json);
    } catch (error) {
      this.logger.error('Error parsing JSON:', error);
      throw new Error('Invalid JSON format');
    }

    if (!parsedData.fix || !parsedData.fix.operation) {
      throw new Error("Invalid JSON structure: Missing 'fix.operations'");
    }

    const op = parsedData.fix.operation;
    const operations: FileOperation[] = [];

    if (op.type === 'WRITE') {
      operations.push({
        action: 'write',
        originalPath: filePath,
        code: op.content?.trim(),
      });
    } else if (op.type === 'RENAME') {
      operations.push({
        action: 'rename',
        originalPath: op.original_path,
        renamePath: op.path,
      });
    } else if (op.type === 'READ' && Array.isArray(op.paths)) {
      for (const path of op.paths) {
        operations.push({
          action: 'read',
          originalPath: path,
        });
      }
    }

    // this.logger.log('Extracted operations:', operations);
    return operations;
  }
}
