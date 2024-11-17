// backend-overview-prompt.ts
export const generateBackendOverviewPrompt = (
  projectName: string,
  dbRequirements: string,
  language: string,
  framework: string,
  packages: Record<string, string>,
): string => {
  return `You are a Senior Backend Architect specializing in ${language} with ${framework}. Analyze the provided Database Requirements and generate the System Overview and API Endpoints specifications for ${projectName}.

Database Requirements:
${dbRequirements}

Technology Stack:
- Language: ${language}
- Framework: ${framework}
- Key Packages:
${Object.entries(packages)
  .map(([pkg, version]) => `  - ${pkg}@${version}`)
  .join('\n')}

Generate a Backend Overview Document following these guidelines:

### Instructions and Rules:
1. Design a clear system architecture based on the technology stack
2. Define all necessary API endpoints based on database requirements
3. Follow RESTful or GraphQL conventions as appropriate
4. Consider the relationships between different entities
5. Focus on clean and maintainable API design

Your reply must start with: "\`\`\`BackendOverview" and end with "\`\`\`".

Include these sections:

#### 1. System Overview
- **Project Name**: ${projectName}
- **Technology Stack**
  - Core technology choices
  - Framework architecture
  - Key dependencies and their purposes
- **Architecture Patterns**
  - Framework-specific patterns
  - Project structure
  - Dependency management
  - Configuration management
  - Service organization

#### 2. API Endpoints
For each endpoint:
\`\`\`
Route: /api/resource
Method: GET|POST|PUT/DELETE
Purpose: Functional description
Request:
  Headers: {
    "Authorization": "Bearer {token}"
    // Other headers
  }
  Params: {
    // URL parameters
  }
  Query: {
    // Query parameters
  }
  Body: {
    // Request body schema
  }
Response:
  Success: {
    // Success response schema
  }
  Errors: {
    // Error response schemas
  }
Required Auth: Yes/No
\`\`\``;
};

// backend-implementation-prompt.ts
export const generateBackendImplementationPrompt = (
  backendOverview: string,
  language: string,
  framework: string,
): string => {
  return `You are a Senior Backend Architect specializing in ${language} with ${framework}. Based on the provided Backend Overview, generate detailed implementation requirements for security, error handling, and other technical aspects.

Backend Overview:
${backendOverview}

Generate detailed implementation requirements following these sections:

Your reply must start with: "\`\`\`BackendImplementation" and end with "\`\`\`".

#### 3. Implementation Details
For each major component:
- **Request Handlers/Controllers**
  - Implementation approach
  - Request processing flow
  - Response formatting
  - Middleware integration

- **Business Logic Layer/Services**
  - Service patterns
  - Business rule implementation
  - External service integration
  - Transaction management

- **Data Access Layer**
  - Database interaction patterns
  - Query optimization
  - Data mapping strategy
  - Cache integration

- **Middleware Components**
  - Authentication middleware
  - Validation middleware
  - Logging middleware
  - Error handling middleware

#### 4. Security Implementation
- Authentication strategy
  - Token management
  - Session handling
  - Refresh token mechanism
- Authorization rules
  - Role-based access control
  - Permission management
  - Resource ownership
- Input validation
  - Request validation
  - Data sanitization
- API security
  - Rate limiting
  - CORS configuration
  - Security headers
- Data protection
  - Encryption methods
  - Secure storage
  - PII handling

#### 5. Error Handling
- Error handling strategy
  - Global error handler
  - Domain-specific errors
  - Operational errors
- Error response format
  - Error codes
  - Error messages
  - Debug information
- Error types and codes
  - HTTP status codes
  - Application error codes
  - Validation errors
- Logging strategy
  - Log levels
  - Log format
  - Log storage

Focus on:
1. ${language} and ${framework} specific implementation patterns
2. Best practices for each component
3. Security considerations
4. Error handling and logging
5. Performance optimization`;
};
