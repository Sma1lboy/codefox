export const generateBackendCodePrompt = (
  projectName: string,
  sitemapDoc: string,
  datamapDoc: string,
  backendRequirementDoc: string,
  databaseType: string,
  databaseSchemas: string,
  currentFile: string,
  fileType: string = 'javascript',
  dependencyFile: string,
): string => {
  const defaultDependencies = {
    sqlite3: '^5.1.6',
    express: '^4.18.2',
  };

  // Parse dependency file if provided, otherwise use defaults
  // TODO: get dependencies info from embedding model
  let dependencies;
  try {
    dependencies = dependencyFile
      ? JSON.parse(dependencyFile)
      : defaultDependencies;
  } catch (error) {
    dependencies = defaultDependencies;
  }

  return `You are an expert backend developer. 
        Your task is to generate a complete backend codebase within a single file for a project named "${projectName}". The code should be written using the Express framework with ES Module syntax (using \`import\` statements), and the database is ${databaseType}. The code must be written in \`${fileType}\`. The backend code should be scalable, maintainable, and adhere to best practices.
   
        ### Project Dependencies
        The project uses the following dependencies:
        \`\`\`json
        ${JSON.stringify(dependencies, null, 2)}
        \`\`\`
  
        ### Based on the following input: 
        
       - **Project Name:** ${projectName}
       - **Sitemap Documentation:** ${sitemapDoc}
       - **Data Analysis Document:** ${datamapDoc}
       - **Backend Requirements:** ${backendRequirementDoc}
       - **Database schemas:** These schemas are defined in \`./schema.sql\`. The code must read and execute this file during database initialization.
       - **Current Implementation:** ${currentFile || 'No existing implementation'}
  
       ### Backend Requirements Analysis:
       Based on the provided backend requirements document, ensure implementation of:
       - All specified API endpoints and their functionality
       - Required authentication and authorization mechanisms
       - Specific business logic requirements
       - Data validation rules
       - Response formats and status codes
       - Rate limiting and security measures if specified
       - Required integrations with external services
       - Performance requirements and optimization needs
  
       ### Instructions and Rules:
       
       **Include:**
       1. **Server Setup:**
          - Initialize the server using the Express framework with ES Module syntax (use \`import\` instead of \`require\`).
          - Configure middleware for JSON parsing and CORS.
   
       2. **Database Connection and Initialization:**
          For SQLite database initialization, you must include code to execute the ./schema.sql file. There are several approaches:
  
          1. Using better-sqlite3:
          \`\`\`${fileType}
          // Direct execution
          db.exec(fs.readFileSync('./schema.sql', 'utf-8'));
          \`\`\`
  
          2. Using sqlite3 CLI:
          \`\`\`${fileType}
          // Execute using sqlite3 CLI
          import { exec } from 'child_process';
          exec('sqlite3 database.sqlite < ./schema.sql', (error, stdout, stderr) => {
            if (error) {
              console.error('Error executing schema:', error);
              return;
            }
          });
          \`\`\`
  
          3. Using node-sqlite3:
          \`\`\`${fileType}
          // Read and execute SQL file
          const initSchema = fs.readFileSync('./schema.sql', 'utf-8');
          db.exec(initSchema, (err) => {
            if (err) {
              console.error('Error executing schema:', err);
              return;
            }
          });
          \`\`\`
  
          **Important Database Considerations:**
          - Schema execution must happen during application startup
          - Add proper error handling for schema execution
          - Database file path should be configurable via environment variables
          - Consider adding checks to prevent re-running schema if tables exist
          - Enable foreign key constraints
          - Implement connection pooling if needed
  
       3. **Implementation Guidelines for SQLite:**
       1. **Basic Database Operations:**
       \`\`\`${fileType}
       // Using sqlite3
       import sqlite3 from 'sqlite3';
       const db = new sqlite3.Database('./database.sqlite');
  
       // Basic query example
       db.all("SELECT * FROM users", [], (err, rows) => {
         if (err) throw err;
         console.log(rows);
       });
       \`\`\`
  
       2. **Performance-Critical Operations:**
       \`\`\`${fileType}
       // Using better-sqlite3
       import Database from 'better-sqlite3';
       const db = new Database('database.sqlite', { verbose: console.log });
  
       // Prepared statement example
       const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
       const user = stmt.get(userId);
       \`\`\`
   
       4. **Route Definitions:**
          - Define RESTful API endpoints based on the sitemap documentation.
          - Implement example routes (e.g., GET /api/users, POST /api/users) that interact with the database.
          - Ensure proper validation for incoming requests.
   
       5. **Controllers, Models, and Services:**
          - Create prepared statements in service layer for better performance.
          - Use transactions where appropriate for data consistency.
          - Implement proper parameter binding for all database operations.
          - Services should handle all database interactions.
          - Controllers should only handle HTTP logic and call services.
   
       6. **Error Handling:**
          - Implement centralized error handling middleware.
          - Add specific error handling for database operations.
          - Ensure error messages are meaningful and appropriate for clients.
          - Include proper logging for errors.
   
       7. **Environment Configuration:**
          - Use dotenv or similar for environment variables.
          - Database configuration should be environment-based.
          - Server port and other settings should be configurable.
   
       8. **Comments and Documentation:**
          - Add comments explaining each section and key code blocks.
          - Document the database initialization process.
          - Include examples of how to use the service functions.
          - Add API endpoint documentation.
   
       **Do Not Include:**
       - Inline or hardcoded SQL queries in the application code.
       - Complex business logic beyond basic CRUD operations.
       - Manual schema modifications outside of schema.sql file.
       - Hardcoded configuration values.
   
       **Special Requirements:**
       - Use environment variables for database path and server settings.
       - Implement proper statement preparation and parameter binding.
       - Ensure all database operations are wrapped in appropriate error handling.
       - Use proper TypeScript types and interfaces.
       - Implement proper logging throughout the application.
   
       ### Ask Yourself:
       1. Is the database initialization process robust and idempotent?
       2. Are prepared statements used consistently throughout the code?
       3. Is proper error handling implemented for all operations?
       4. Are transactions used appropriately for data consistency?
       5. Is the schema.sql file properly loaded and executed?
       6. Are all configurations properly externalized?
       7. Is the code properly typed with TypeScript?
       8. Is there adequate logging and error tracking?
   
       ### Output Format:
       
       Provide the backend code within \`<GENERATE>\` tags as follows:
       
       <GENERATE>
       // Your generated backend code goes here
       </GENERATE>
       `;
};
