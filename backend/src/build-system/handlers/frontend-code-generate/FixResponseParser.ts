import { XMLParser } from 'fast-xml-parser';
import { FileOperation, LLMFixResponse } from './FileOperationManager';
import { Logger } from '@nestjs/common';
import path from 'path';

export class FixResponseParser {
  private readonly parser: XMLParser;
  private readonly logger = new Logger('FixResponseParser');

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
      textNodeName: 'value',
      allowBooleanAttributes: true,
      alwaysCreateTextNode: true
    });
  }

  parse(xml: string): LLMFixResponse {
    try {
      const parsed = this.parser.parse(xml);
      return this.transformResponse(parsed);
    } catch (error) {
      this.logger.error('XML parsing failed', error.stack);
      throw new Error('Invalid XML format from LLM');
    }
  }

  private transformResponse(parsed: any): LLMFixResponse {
    const result: LLMFixResponse = {
      operations: [],
      reasoning: ''
    };

    // Extract reasoning if available
    result.reasoning = parsed.FIX.REASONING?.value || 'No reasoning provided';

    // Process operations
    const actions = parsed.FIX.OPERATIONS?.ACTION || [];
    const actionsArray = Array.isArray(actions) ? actions : [actions];

    for (const action of actionsArray) {
      const operation = this.parseAction(action);
      if (operation) result.operations.push(operation);
    }

    // Handle generated code for WRITE operations
    const generatedCode = parsed.FIX.GENERATE?.value;
    if (generatedCode) {
      this.applyGeneratedCode(result.operations, generatedCode);
    }

    return result;
  }

  private parseAction(action: any): FileOperation | null {
    try {
      switch (action.type.toUpperCase()) {
        case 'WRITE':
          return {
            action: 'write',
            path: this.sanitizePath(action.path),
            originalPath: '', // Not used for write
            content: '' // Temporarily empty
          };
        case 'RENAME':
          return {
            action: 'rename',
            path: this.sanitizePath(action.path),
            originalPath: this.sanitizePath(action.ORIGINAL_PATH.value)
          };
        default:
          this.logger.warn(`Unknown action type: ${action.type}`);
          return null;
      }
    } catch (error) {
      this.logger.warn(`Invalid action format: ${JSON.stringify(action)}`);
      return null;
    }
  }

  private applyGeneratedCode(operations: FileOperation[], code: string): void {
    const writeOperations = operations.filter(op => op.action === 'write');
    if (writeOperations.length > 0) {
      // Apply generated code to the first WRITE operation
      writeOperations[0].content = code;
    }
  }

  private sanitizePath(rawPath: string): string {
    const sanitized = path.normalize(rawPath)
      .replace(/(\.\.\/|\.\.\\)/g, '') // Prevent path traversal
      .replace(/^\/+/, '') // Remove leading slashes
      .trim();

    if (!sanitized) {
      throw new Error(`Invalid path after sanitization: ${rawPath}`);
    }

    return sanitized;
  }
}