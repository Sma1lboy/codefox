export const generateBackendCodePrompt = (
  projectName: string,
  sitemapDoc: string,
  DatamapDoc: string,
  currentFile: string,
  dependencyFile: string,
): string => {
  return `You are an expert backend developer. Your task is to generate a complete backend codebase within a single file for a project named "${projectName}". The code should be written using the Express framework with ES Module syntax (using \`import\` statements) and should include all necessary functionalities to cover essential backend operations while ensuring scalability and maintainability.
 
 ### Based on the following input:
 
 - **Project Name:** ${projectName}
 - **Sitemap Documentation:** ${sitemapDoc}
 - **Data Analysis Document:** ${DatamapDoc}
 
 ### Instructions and Rules:
 
 **Include:**
 1. **Server Setup:**
    - Initialize the server using the Express framework with ES Module syntax (use \`import\` instead of \`require\`).
    - Configure middleware for JSON parsing and CORS.
 
 2. **Database Connection:**
    - Implement a separate section for database connection handling.
    - Determine the database type (e.g., SQLite, PostgreSQL, MySQL) based on provided configuration.
    - Use the appropriate connection method for the specified database type.
    - Load and execute a schema script file (e.g., \`schema.sql\`) to initialize the database structure.
    - Ensure that all CRUD operations interact with the database instead of using in-memory data structures.
 
 3. **Route Definitions:**
    - Define RESTful API endpoints based on the sitemap documentation.
    - Implement at least two example routes (e.g., GET /api/users, POST /api/users) that perform CRUD operations using the database.
 
 4. **Controllers, Models, and Services:**
    - Include all controllers, models, and services within the single file, organized into clear sections using comments.
    - Ensure that database interactions are encapsulated within appropriate service functions.
 
 5. **Error Handling:**
    - Implement basic error handling middleware.
    - Ensure that meaningful error messages are returned for invalid requests.
 
 6. **Comments and Documentation:**
    - Add comments explaining the purpose of each section and major code blocks.
    - Ensure the code is readable and follows best practices.
 
 **Do Not Include:**
 - External service integrations beyond the specified database setup.
 - Complex business logic beyond basic CRUD operations.
 
 **File Naming and Structure:**
 - Since all code is to be included in a single file, organize the code with clear sections using comments.
 - Follow consistent coding conventions and formatting as per the Express standards.
 
 **Special Requirements:**
 - **ES Module Syntax:** Use \`import\` statements instead of \`require\`.
 - **Database Handling:** 
   - Use the specified database type for database operations.
   - Initialize the database connection using a schema script file (e.g., \`schema.sql\`).
   - Avoid using in-memory data structures like arrays; all data should be persisted in the database.
 
 - **Environment Variables:** Utilize environment variables for configuration settings such as database connection details and server port.
 
 ### Ask Yourself:
 1. Are you covering all the necessary routes based on the sitemap documentation? If not, add the missing routes.
 2. Are the controller functions adequately handling the requests and responses using the database? If not, enhance them.
 3. Is the error handling comprehensive enough for basic testing? If not, improve it.
 4. Are the comments clear and descriptive to aid understanding and maintenance?
 5. Are you using ES Module syntax correctly throughout the code?
 6. Is the database connection handled appropriately based on the specified database type?
 7. Are you loading and executing the schema script file to initialize the database?
 
 ### Output Format:
 
 Provide the backend code within \`<GENERATE>\` tags as follows:
 
 <GENERATE>
 // Your generated backend code goes here
 </GENERATE>
 `;
};
