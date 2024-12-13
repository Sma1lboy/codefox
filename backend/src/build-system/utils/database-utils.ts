/**
 * Supported database types.
 */
export enum DatabaseType {
  PostgreSQL = 'PostgreSQL',
  MongoDB = 'MongoDB',
  SQLite = 'SQLite',
  MySQL = 'MySQL',
  MariaDB = 'MariaDB',
  Oracle = 'Oracle',
  SQLServer = 'SQLServer',
}

/**
 * Mapping of database types to their corresponding schema file extensions.
 */
const databaseSchemaExtensions: Record<DatabaseType, string> = {
  [DatabaseType.PostgreSQL]: 'sql',
  [DatabaseType.MongoDB]: 'js',
  [DatabaseType.SQLite]: 'sql',
  [DatabaseType.MySQL]: 'sql',
  [DatabaseType.MariaDB]: 'sql',
  [DatabaseType.Oracle]: 'sql',
  [DatabaseType.SQLServer]: 'sql',
};

/**
 * Retrieves the schema file extension based on the provided database type.
 * @param databaseType - The type of the database.
 * @returns The corresponding schema file extension.
 * @throws Error if the database type is unsupported.
 */
export function getSchemaFileExtension(databaseType: DatabaseType): string {
  const extension = databaseSchemaExtensions[databaseType];
  if (!extension) {
    throw new Error(
      `Unsupported database type: ${databaseType}. Supported types are: ${Object.values(
        DatabaseType,
      ).join(', ')}.`,
    );
  }
  return extension;
}

/**
 * Validates whether the provided database type is supported.
 * @param databaseType - The type of the database.
 * @returns True if supported, false otherwise.
 */
export function isSupportedDatabaseType(
  databaseType: string,
): databaseType is DatabaseType {
  return Object.values(DatabaseType).includes(databaseType as DatabaseType);
}

/**
 * Retrieves the list of supported database types.
 * @returns An array of supported database type strings.
 */
export function getSupportedDatabaseTypes(): string[] {
  return Object.values(DatabaseType);
}

/**
 * Extracts content within <GENERATE> tags from a given string.
 * @param input - The input string containing <GENERATE> tags.
 * @returns The content within the <GENERATE> tags.
 * @throws Error if the <GENERATE> tags are missing or improperly formatted.
 */
export function parseGenerateTag(input: string): string {
  const generateTagRegex = /<GENERATE>([\s\S]*?)<\/GENERATE>/;
  const match = input.match(generateTagRegex);
  if (!match || match.length < 2) {
    throw new Error(
      'Invalid format: <GENERATE> tags are missing or improperly formatted.',
    );
  }
  return match[1].trim();
}

/**
 * Removes Markdown code block fences (e.g. ``` or ```javascript) from the given string.
 * This function will remove lines that contain triple backticks, leaving only the actual code content.
 *
 * @param input - The input string potentially containing Markdown code fences.
 * @returns The input string without Markdown code block fences.
 */
export function removeCodeBlockFences(input: string): string {
  return input
    .split('\n')
    .filter((line) => !line.trim().startsWith('```'))
    .join('\n')
    .trim();
}
