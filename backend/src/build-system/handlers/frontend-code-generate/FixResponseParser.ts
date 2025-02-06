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

    if (!parsedData.fix || !parsedData.fix.operations) {
      throw new Error("Invalid JSON structure: Missing 'fix.operations'");
    }

    const operations: FileOperation[] = parsedData.fix.operations
      .map((op: any) => {
        if (op.type === 'WRITE') {
          return {
            action: 'write',
            originalPath: filePath,
            code: parsedData.fix.generate?.trim(),
          };
        } else if (op.type === 'RENAME') {
          return {
            action: 'rename',
            originalPath: op.original_path,
            renamePath: op.path,
            code: parsedData.fix.generate?.trim(),
          };
        }
        return null;
      })
      .filter(Boolean);

    // this.logger.log('Extracted operations:', operations);
    return operations;
  }
}
