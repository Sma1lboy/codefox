export const generateBackendCodePrompt = (
  projectName: string,
  sitemapDoc: string,
  DatamapDoc: string,
  currentFile: string,
  dependencyFile: string,
): string => {
  return `You are an expert backend developer. Your task is to generate a complete backend codebase within a single file for a project named "AwesomeApp". The code should be written using the Express framework and should include all necessary functionalities to cover essential backend operations while ensuring scalability and maintainability.

### Based on the following input:

- **Project Name:** ${projectName}
- **Sitemap Documentation:** ${sitemapDoc}
- **Data Analysis Document:** ${DatamapDoc}

### Instructions and Rules:

**Include:**
1. **Server Setup:**
   - Initialize the server using the Express framework.
   - Configure middleware for JSON parsing and CORS.

2. **Route Definitions:**
   - Define RESTful API endpoints based on the sitemap documentation.
   - Implement at least two example routes (e.g., GET /api/users, POST /api/users).

3. Include all controllers, model, and service in one file.

4. **Error Handling:**
   - Implement basic error handling middleware.
   - Ensure that meaningful error messages are returned for invalid requests.

5. **Comments and Documentation:**
   - Add comments explaining the purpose of each section and major code blocks.
   - Ensure the code is readable and follows best practices.

**Do Not Include:**
- Database connections or ORM integrations.
- External service integrations.
- Complex business logic beyond basic CRUD operations.

**File Naming and Structure:**
- Since all code is to be included in a single file, organize the code with clear sections using comments.
- Follow consistent coding conventions and formatting as per the Express standards.

### Ask Yourself:
1. Are you covering all the necessary routes based on the sitemap documentation? If not, add the missing routes.
2. Are the controller functions adequately handling the requests and responses? If not, enhance them.
3. Is the error handling comprehensive enough for basic testing? If not, improve it.
4. Are the comments clear and descriptive to aid understanding and maintenance?

### Output Format:

Provide the backend code within markdown code blocks as follows:

\`\`\`javascript
\`\`\`
  
    `;
};
