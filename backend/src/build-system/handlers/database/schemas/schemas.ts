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
  MissingConfigurationError,
  ResponseParsingError,
  FileWriteError,
  ModelTimeoutError,
  TemporaryServiceUnavailableError,
  RateLimitExceededError,
} from 'src/build-system/errors';

/**
 * DBSchemaHandler is responsible for generating database schemas based on provided requirements.
 */
export class DBSchemaHandler implements BuildHandler {
  readonly id = 'op:DATABASE:SCHEMAS';
  private readonly logger: Logger = new Logger('DBSchemaHandler');

  async run(context: BuilderContext): Promise<BuildResult> {
    this.logger.log('Generating Database Schemas...');

    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const databaseType =
      context.getGlobalContext('databaseType') || 'PostgreSQL';

    const dbRequirements = context.getNodeData('op:DATABASE_REQ');
    if (!dbRequirements) {
      this.logger.error('Missing database requirements.');
      throw new MissingConfigurationError(
        'Missing required database requirements.',
      );
    }

    if (!isSupportedDatabaseType(databaseType)) {
      const supportedTypes = getSupportedDatabaseTypes().join(', ');
      this.logger.error(
        `Unsupported database type: ${databaseType}. Supported types: ${supportedTypes}`,
      );
      throw new MissingConfigurationError(
        `Unsupported database type: ${databaseType}. Supported types: ${supportedTypes}.`,
      );
    }

    let fileExtension: string;
    try {
      fileExtension = getSchemaFileExtension(databaseType as DatabaseType);
    } catch (error) {
      this.logger.error('Error determining schema file extension:', error);
      throw new ResponseParsingError(
        `Failed to determine schema file extension for database type: ${databaseType}.`,
      );
    }

    this.logger.debug(`Schema file extension: .${fileExtension}`);

    const dbAnalysis = await this.analyzeDatabaseRequirements(
      context,
      projectName,
      dbRequirements,
      databaseType,
    );

    const schemaContent = await this.generateDatabaseSchema(
      context,
      dbAnalysis,
      databaseType,
      fileExtension,
    );

    await this.validateDatabaseSchema(context, schemaContent, databaseType);

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
      throw new FileWriteError('Failed to write schema file.');
    }

    return {
      success: true,
      data: schemaContent,
    };
  }

  private async analyzeDatabaseRequirements(
    context: BuilderContext,
    projectName: string,
    dbRequirements: any,
    databaseType: string,
  ): Promise<string> {
    const analysisPrompt = prompts.analyzeDatabaseRequirements(
      projectName,
      dbRequirements,
      databaseType,
    );

    try {
      const analysisResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: analysisPrompt, role: 'system' }],
      });

      if (!analysisResponse || analysisResponse.trim() === '') {
        throw new ResponseParsingError(
          'Database requirements analysis returned empty.',
        );
      }

      return analysisResponse;
    } catch (error) {
      this.handleModelErrors(error, 'analyze database requirements');
    }
  }

  private async generateDatabaseSchema(
    context: BuilderContext,
    dbAnalysis: string,
    databaseType: string,
    fileExtension: string,
  ): Promise<string> {
    const schemaPrompt = prompts.generateDatabaseSchema(
      dbAnalysis,
      databaseType,
      fileExtension,
    );

    try {
      const schemaResponse = await context.model.chatSync({
        model: 'gpt-4o-mini',
        messages: [{ content: schemaPrompt, role: 'system' }],
      });

      const schemaContent = formatResponse(schemaResponse);
      if (!schemaContent || schemaContent.trim() === '') {
        throw new ResponseParsingError('Generated database schema is empty.');
      }

      return schemaContent;
    } catch (error) {
      this.handleModelErrors(error, 'generate database schema');
    }
  }

  private async validateDatabaseSchema(
    context: BuilderContext,
    schemaContent: string,
    databaseType: string,
  ): Promise<void> {
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
        throw new ResponseParsingError(
          `Schema validation failed: ${validationResponse}`,
        );
      }
    } catch (error) {
      this.handleModelErrors(error, 'validate database schema');
    }
  }

  private handleModelErrors(error: any, stage: string): never {
    switch (error.name) {
      case 'ModelTimeoutError':
        this.logger.warn(`Retryable error during ${stage}: ${error.message}`);
        throw new ModelTimeoutError(error.message);
      case 'TemporaryServiceUnavailableError':
        this.logger.warn(`Retryable error during ${stage}: ${error.message}`);
        throw new TemporaryServiceUnavailableError(error.message);
      case 'RateLimitExceededError':
        this.logger.warn(`Retryable error during ${stage}: ${error.message}`);
        throw new RateLimitExceededError(error.message);
      default:
        this.logger.error(`Non-retryable error during ${stage}:`, error);
        throw new ResponseParsingError(`Failed to ${stage}.`);
    }
  }
}
