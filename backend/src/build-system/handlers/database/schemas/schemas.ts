import { BuildHandler, BuildResult } from 'src/build-system/types';
import { BuilderContext } from 'src/build-system/context';
import { Logger } from '@nestjs/common';
import {
  DatabaseType,
  getSchemaFileExtension,
  getSupportedDatabaseTypes,
  isSupportedDatabaseType,
  parseGenerateTag,
} from '../../../utils/database-utils';
import { writeFile } from 'fs-extra';
import { prompts } from './prompt';

/**
 * Defines the expected order and types of arguments for DBSchemaHandler.
 *
 * Expected argument order:
 * 0 - dbRequirements: string
 */
type DBSchemaArgs = [dbRequirements: string];

/**
 * DBSchemaHandler is responsible for generating database schemas based on provided requirements.
 */
export class DBSchemaHandler implements BuildHandler {
  readonly id = 'op:DATABASE:SCHEMAS';
  private readonly logger: Logger = new Logger('DBSchemaHandler');

  /**
   * Executes the handler to generate database schemas.
   * @param context - The builder context containing configuration and utilities.
   * @param args - The variadic arguments required for generating the database schemas.
   * @returns A BuildResult containing the generated schema content and related data.
   */
  async run(context: BuilderContext, ...args: any[]): Promise<BuildResult> {
    this.logger.log('Generating Database Schemas...');

    // Retrieve projectName and databaseType from context
    const projectName =
      context.getData('projectName') || 'Default Project Name';
    const databaseType = context.getData('databaseType') || 'PostgreSQL';
    this.logger.debug(`Project Name: ${projectName}`);
    this.logger.debug(`Database Type: ${databaseType}`);

    // Validate and extract args
    if (!args || !Array.isArray(args)) {
      throw new Error(
        'Database schema generation requires specific configuration arguments as an array.',
      );
    }

    const [dbRequirements] = args as DBSchemaArgs;

    this.logger.debug('Database requirements are provided.');

    // Check if the databaseType is supported
    if (!isSupportedDatabaseType(databaseType)) {
      throw new Error(
        `Unsupported database type: ${databaseType}. Supported types are: ${getSupportedDatabaseTypes().join(
          ', ',
        )}.`,
      );
    }

    // Get the file extension for the schema
    let fileExtension: string;
    try {
      fileExtension = getSchemaFileExtension(databaseType as DatabaseType);
    } catch (error) {
      this.logger.error('Error determining schema file extension:', error);
      throw new Error(
        `Failed to determine schema file extension for database type: ${databaseType}.`,
      );
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
      // Invoke the language model to analyze database requirements
      const analysisResponse = await context.model.chatSync(
        {
          content: analysisPrompt,
        },
        'gpt-4o-mini', // Specify the model variant as needed
      );

      // Parse the <GENERATE> tag to extract DBAnalysis content
      dbAnalysis = parseGenerateTag(analysisResponse);
    } catch (error) {
      this.logger.error('Error during database requirements analysis:', error);
      return {
        success: false,
        error: new Error('Failed to analyze database requirements.'),
      };
    }

    this.logger.debug('Database requirements analyzed successfully.');

    // Step 2: Generate database schema based on analysis
    let schemaPrompt: string;
    try {
      schemaPrompt = prompts.generateDatabaseSchema(
        dbAnalysis,
        databaseType,
        fileExtension,
      );
    } catch (error) {
      this.logger.error('Error during schema prompt generation:', error);
      return {
        success: false,
        error: new Error('Failed to generate schema prompt.'),
      };
    }

    let schemaContent: string;
    try {
      // Invoke the language model to generate the database schema
      const schemaResponse = await context.model.chatSync(
        {
          content: schemaPrompt,
        },
        'gpt-4o-mini', // Specify the model variant as needed
      );

      // Parse the <GENERATE> tag to extract schema content
      schemaContent = parseGenerateTag(schemaResponse);
    } catch (error) {
      this.logger.error('Error during schema generation:', error);
      return {
        success: false,
        error: new Error('Failed to generate database schema.'),
      };
    }

    this.logger.debug('Database schema generated successfully.');

    // Define the schema file name
    const schemaFileName = `schema.${fileExtension}`;

    // Write the schemaContent to a file
    try {
      await writeFile(schemaFileName, schemaContent, 'utf-8');
      this.logger.log(`Schema file (${schemaFileName}) written successfully.`);
    } catch (error) {
      this.logger.error('Error writing schema file:', error);
      return {
        success: false,
        error: new Error('Failed to write schema file.'),
      };
    }

    this.logger.debug(`Schema file (${schemaFileName}) prepared.`);

    // Return the generated schema content and file information
    return {
      success: true,
      data: schemaContent,
    };
  }
}