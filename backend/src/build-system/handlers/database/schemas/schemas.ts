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
import { chatSyncWithClocker } from 'src/build-system/utils/handler-helper';
import {
  FileWriteError,
  ModelUnavailableError,
  ResponseTagError,
} from 'src/build-system/errors';
import { DatabaseRequirementHandler } from '../requirements-document';
import { BuildNode, BuildNodeRequire } from 'src/build-system/hanlder-manager';

@BuildNode()
@BuildNodeRequire([DatabaseRequirementHandler])
export class DBSchemaHandler implements BuildHandler {
  private readonly logger: Logger = new Logger('DBSchemaHandler');
  async run(context: BuilderContext): Promise<BuildResult> {
    this.logger.log('Generating Database Schemas...');

    // 1. Get required context data
    const projectName =
      context.getGlobalContext('projectName') || 'Default Project Name';
    const databaseType =
      context.getGlobalContext('databaseType') || 'PostgreSQL';
    const dbRequirements = context.getNodeData(DatabaseRequirementHandler);
    const uuid = context.getGlobalContext('projectUUID');

    // 2. Validate database type
    if (!isSupportedDatabaseType(databaseType)) {
      throw new Error(
        `Unsupported database type: ${databaseType}. Supported types are: ${getSupportedDatabaseTypes().join(', ')}.`,
      );
    }

    // 3. Get file extension
    let fileExtension: string;
    try {
      fileExtension = getSchemaFileExtension(databaseType as DatabaseType);
    } catch (error) {
      this.logger.error('Error determining schema file extension:', error);
      throw new FileWriteError(
        `Failed to determine schema file extension for database type: ${databaseType}.`,
      );
    }

    try {
      // Step 1: Analyze database requirements
      this.logger.debug('Starting database requirements analysis...');
      const analysisPrompt = prompts.analyzeDatabaseRequirements(
        projectName,
        dbRequirements,
        databaseType,
      );
      let dbAnalysis: string;
      try {
        const analysisResponse = await chatSyncWithClocker(
          context,
          {
            model: 'gpt-4o-mini',
            messages: [{ content: analysisPrompt, role: 'system' }],
          },
          'analyzeDatabaseRequirements',
          DBSchemaHandler.name,
        );
        dbAnalysis = formatResponse(analysisResponse);
      } catch (error) {
        throw new ModelUnavailableError(
          `Model unavailable during analysis: ${error}`,
        );
      }

      // Step 2: Generate schema based on analysis
      this.logger.debug('Generating database schema...');
      const schemaPrompt = prompts.generateDatabaseSchema(
        dbAnalysis,
        databaseType,
        fileExtension,
      );
      let schemaContent: string;
      try {
        const schemaResponse = await chatSyncWithClocker(
          context,
          {
            model: 'gpt-4o-mini',
            messages: [{ content: schemaPrompt, role: 'system' }],
          },
          'generateDatabaseSchema',
          DBSchemaHandler.name,
        );
        schemaContent = formatResponse(schemaResponse);
      } catch (error) {
        throw new ModelUnavailableError(
          `Model unavailable during schema generation: ${error}`,
        );
      }

      // Step 3: Validate generated schema
      this.logger.debug('Validating generated schema...');
      const validationPrompt = prompts.validateDatabaseSchema(
        schemaContent,
        databaseType,
      );
      let validationResult: string;
      try {
        const validationResponse = await chatSyncWithClocker(
          context,
          {
            model: 'gpt-4o-mini',
            messages: [{ content: validationPrompt, role: 'system' }],
          },
          'validateDatabaseSchema',
          DBSchemaHandler.name,
        );
        validationResult = formatResponse(validationResponse);
      } catch (error) {
        throw new ModelUnavailableError(
          `Model unavailable during validation: ${error}`,
        );
      }

      // Check validation result
      if (!validationResult.includes('Validation Passed')) {
        throw new ResponseTagError(
          `Schema validation failed: ${validationResult}`,
        );
      }

      // Write schema to file
      const schemaFileName = `schema.${fileExtension}`;
      try {
        saveGeneratedCode(
          path.join(uuid, 'backend', schemaFileName),
          schemaContent,
        );
        this.logger.log(
          `Schema file (${schemaFileName}) written successfully.`,
        );
      } catch (error) {
        throw new FileWriteError(
          `Failed to write schema file: ${error.message}`,
        );
      }

      return {
        success: true,
        data: schemaContent,
      };
    } catch (error) {
      this.logger.error('Error in schema generation process:', error);
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }
  }
}
