export const prompts = {
  // Step 1: Analyze requirements and generate database tasks
  analyzeDatabaseRequirements: (
    projectName: string,
    dbRequirements: string,
    databaseType: string = 'PostgreSQL',
  ): string => {
    return `You are a Database Architect specializing in ${databaseType}. Your task is to analyze the provided database requirements document and create a clear plan for schema generation. Use the following requirements as input:

${dbRequirements}

Generate a structured analysis describing what needs to be created for each database entity. Your reply must start with "\`\`\`DBAnalysis" and end with "\`\`\`".

For each entity in the requirements:
1. What tables/collections need to be created
2. What indexes are necessary
3. What constraints must be enforced
4. What relationships need to be established

Example output format:

\`\`\`DBAnalysis
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
\`\`\``;
  },

  // Step 2: Generate actual schema based on analysis
  generateDatabaseSchema: (
    dbAnalysis: string,
    databaseType: string = 'PostgreSQL',
  ): string => {
    return `You are a Database Engineer specializing in ${databaseType}. Generate the complete database schema based on the following analysis, using appropriate ${databaseType} syntax and features:

    Here is dbAnalysis content {${dbAnalysis}}
    
Rules for generation:
1. Use ${databaseType}-specific data types and features
2. Do not include any comments in the output
3. Use standardized naming conventions
4. Include all necessary constraints and indexes
5. Generate schema in the correct creation order for dependencies

Your reply must start with "\`\`\`${databaseType}" and end with "\`\`\`".

For PostgreSQL, output format should be like:
\`\`\`sql
CREATE TYPE subscription_type_enum AS ENUM ('FREE', 'PREMIUM', 'FAMILY');

CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    subscription_type subscription_type_enum NOT NULL DEFAULT 'FREE',
    preferences JSONB DEFAULT '{"theme":"light","audioQuality":"high"}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE (email),
    UNIQUE (username)
);

CREATE INDEX idx_users_email ON users(email);
[Continue with other tables...]
\`\`\`

For MongoDB, output format should be like:
\`\`\`javascript
db.createCollection("users", {
   validator: {
      $jsonSchema: {
         bsonType: "object",
         required: ["email", "username", "password_hash", "subscription_type"],
         properties: {
            email: { bsonType: "string" },
            username: { bsonType: "string" },
            password_hash: { bsonType: "string" },
            subscription_type: { enum: ["FREE", "PREMIUM", "FAMILY"] }
         }
      }
   }
});

db.users.createIndex({ "email": 1 }, { unique: true });
[Continue with other collections...]
\`\`\``;
  },
};
