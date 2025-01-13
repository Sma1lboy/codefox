import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import {
  DatabaseType,
  getSchemaFileExtension,
  getSupportedDatabaseTypes,
  isSupportedDatabaseType,
} from '../../../utils/database-utils';
import { prompts } from './prompt';
import { saveGeneratedCode } from 'src/build-system/utils/files';
import * as path from 'path';
import { formatResponse } from 'src/build-system/utils/strings';
import {
  RetryableError,
  NonRetryableError,
} from 'src/build-system/retry-handler';

/**
 * DBSchemaHandler is responsible for generating database schemas based on provided requirements.
 */
export class DBSchemaHandler implements BuildHandler {
  readonly id = 'op:DATABASE:SCHEMAS';
  private readonly logger: Logger = new Logger('DBSchemaHandler');

  /**
   * Executes the handler to generate database schemas.
   * @param context - The builder context containing configuration and utilities.
   * @returns A BuildResult containing the generated schema content and related data.
   */
  async run(context: BuilderContext): Promise<BuildResult> {
    this.logger.log('Generating Database Schemas...');

    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const databaseType =
      context.getGlobalContext('databaseType') || 'PostgreSQL';

    const dbRequirements = context.getNodeData('op:DATABASE_REQ');
    if (!dbRequirements) {
      this.logger.error('Missing database requirements.');
      return {
        success: false,
        error: new NonRetryableError('Missing required database requirements.'),
      };
    }

    if (!isSupportedDatabaseType(databaseType)) {
      const supportedTypes = getSupportedDatabaseTypes().join(', ');
      this.logger.error(
        `Unsupported database type: ${databaseType}. Supported types: ${supportedTypes}`,
      );
      return {
        success: false,
        error: new NonRetryableError(
          `Unsupported database type: ${databaseType}. Supported types: ${supportedTypes}.`,
        ),
      };
    }

    let fileExtension: string;
    try {
      fileExtension = getSchemaFileExtension(databaseType as DatabaseType);
    } catch (error) {
      this.logger.error('Error determining schema file extension:', error);
      return {
        success: false,
        error: new NonRetryableError(
          `Failed to determine schema file extension for database type: ${databaseType}.`,
        ),
      };
    }

    this.logger.debug(`Schema file extension: .${fileExtension}`);

    // Step 1: Analyze database requirements
    const analysisPrompt = prompts.analyzeDatabaseRequirements(
      projectName,
      dbRequirements,
      databaseType,
    );

    let dbAnalysis: string;
    try {
      const analysisResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: analysisPrompt, role: 'system' }],
      });
      dbAnalysis = analysisResponse;
      if (!dbAnalysis || dbAnalysis.trim() === '') {
        throw new RetryableError(
          'Database requirements analysis returned empty.',
        );
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(`Retryable error during analysis: ${error.message}`);
        return { success: false, error };
      }
      this.logger.error('Non-retryable error during analysis:', error);
      return {
        success: false,
        error: new NonRetryableError(
          'Failed to analyze database requirements.',
        ),
      };
    }

    this.logger.debug('Database requirements analyzed successfully.');

    // Step 2: Generate database schema based on analysis
    let schemaContent: string;
    try {
      const schemaPrompt = prompts.generateDatabaseSchema(
        dbAnalysis,
        databaseType,
        fileExtension,
      );
      const schemaResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: schemaPrompt, role: 'system' }],
      });
      schemaContent = formatResponse(schemaResponse);
      if (!schemaContent || schemaContent.trim() === '') {
        throw new RetryableError('Generated database schema is empty.');
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(
          `Retryable error during schema generation: ${error.message}`,
        );
        return { success: false, error };
      }
      this.logger.error('Non-retryable error during schema generation:', error);
      return {
        success: false,
        error: new NonRetryableError('Failed to generate database schema.'),
      };
    }

    this.logger.debug('Database schema generated successfully.');

    // Step 3: Validate the generated schema
    const validationPrompt = prompts.validateDatabaseSchema(
      schemaContent,
      databaseType,
    );

    try {
      const validationResult = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: validationPrompt, role: 'system' }],
      });
      const validationResponse = formatResponse(validationResult);
      if (validationResponse.includes('Error')) {
        throw new RetryableError(
          `Schema validation failed: ${validationResponse}`,
        );
      }
    } catch (error) {
      if (error instanceof RetryableError) {
        this.logger.warn(
          `Retryable error during schema validation: ${error.message}`,
        );
        return { success: false, error };
      }
      this.logger.error('Non-retryable error during schema validation:', error);
      return {
        success: false,
        error: new NonRetryableError('Failed to validate the database schema.'),
      };
    }

    this.logger.debug('Schema validation passed.');

    // Step 4: Save the schema to a file
    const schemaFileName = `schema.${fileExtension}`;
    const uuid = context.getGlobalContext('projectUUID');
    try {
      saveGeneratedCode(
        path.join(uuid, 'backend', schemaFileName),
        schemaContent,
      );
      this.logger.log(`Schema file (${schemaFileName}) written successfully.`);
    } catch (error) {
      this.logger.error('Error writing schema file:', error);
      return {
        success: false,
        error: new NonRetryableError('Failed to write schema file.'),
      };
    }

    return {
      success: true,
      data: schemaContent,
    };
  }
}
