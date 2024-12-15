/**
 * Collection of prompt functions used for various build system operations.
 */

export const prompts = {
  /**
   * Analyzes database requirements and generates a structured analysis.
   * @param projectName - The name of the project.
   * @param dbRequirements - The database requirements as a string.
   * @param databaseType - The type of the database (e.g., PostgreSQL, MongoDB, SQLite).
   * @returns A prompt string for the language model to perform the analysis.
   */
  analyzeDatabaseRequirements: (
    projectName: string,
    dbRequirements: string,
    databaseType: string = 'PostgreSQL',
  ): string => {
    return `You are a Database Architect specializing in ${databaseType}. Your task is to analyze the provided database requirements document and create a clear plan for schema generation. Use the following requirements as input:
 
${dbRequirements}
 
Generate a structured analysis describing what needs to be created for each database entity. Your reply must start with "<GENERATE>DBAnalysis" and end with "</GENERATE>".
 
For each entity in the requirements:
1. What tables/collections need to be created
2. What indexes are necessary
3. What constraints must be enforced
4. What relationships need to be established
 
Example output format:
 
<GENERATE>DBAnalysis
Database: ${projectName}
Type: ${databaseType}

Entity: Users
- Primary table for user accounts
- Required fields: id, email, username, password_hash, subscription_type
- Unique constraints on email and username
- Indexes needed on email and username for quick lookup
- JSON/JSONB field for preferences
- Timestamps for created_at and updated_at

Entity: Playlists
- Primary table for playlist management
- Required fields: id, title, user_id, is_system_generated
- Foreign key relationship to Users
- Index on user_id for quick user playlist lookup
- Composite index on (user_id, title) for unique user playlists

[Continue for all entities...]

Required Junction Tables:
1. playlist_songs
   - Manages N:M relationship between playlists and songs
   - Needs position field for song order
   - Indexes on both foreign keys

2. song_genres
   - Manages N:M relationship between songs and genres
   - Indexes on both foreign keys

Performance Considerations:
1. User table needs hash indexes on email and username
2. Playlist_songs needs index on position for queue management
3. Songs table needs full text search capability
</GENERATE>`;
  },

  /**
   * Generates the database schema based on the analysis.
   * @param dbAnalysis - The database analysis as a string.
   * @param databaseType - The type of the database (e.g., PostgreSQL, MongoDB, SQLite).
   * @param fileExtension - The file extension to use for the schema file.
   * @returns A prompt string for the language model to generate the schema.
   */
  generateDatabaseSchema: (
    dbAnalysis: string,
    databaseType: string = 'PostgreSQL',
    fileExtension: string,
  ): string => {
    return `You are a Database Engineer specializing in ${databaseType}. Generate the complete database schema based on the following analysis, using appropriate ${databaseType} syntax and features:
 
Here is dbAnalysis content:
<GENERATE>
${dbAnalysis}
</GENERATE>
 
Rules for generation:
1. Use ${databaseType}-specific data types and features.
2. Do not include any comments in the output.
3. Use standardized naming conventions.
4. Include all necessary constraints and indexes.
5. Generate schema in the correct creation order for dependencies.
 
Your reply must start with "<GENERATE>" and end with "</GENERATE>".
`;
  },
};
