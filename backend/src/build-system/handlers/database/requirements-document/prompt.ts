export const prompts = {
  generateDatabaseRequirementPrompt: (
    projectName: string,
    uxDatamap: string,
  ): string => {
    return `You are a Database Architect and System Analyst. Your task is to analyze the provided UX Datamap document and generate a comprehensive Database Requirements Document that will support all the data needs identified in the UX design, based on the following inputs:
       - Project name: ${projectName}
       - UX Datamap Content: ${uxDatamap}

Follow these guidelines to generate the database requirements:

### Instructions and Rules:
1. Analyze data elements mentioned in the UX Datamap
2. Carefully distinguish between frontend state management and actual database storage needs
3. Only include entities and attributes that require persistent storage
4. For each feature in the UX Datamap, clearly determine if it needs database support or is purely frontend
5. Identify entities and their relationships
6. Determine data types and constraints
7. Consider data persistence requirements
8. Plan for scalability and performance

### Database Requirements Structure:
---
### Database Requirements Document
#### 1. Overview
- Project scope
- Database purpose
- General requirements

#### 2. Entity Definitions
For each identified entity:
- Entity name and description
- Business rules and constraints
- Key attributes
- Relationships with other entities
- Data retention requirements

#### 3. Data Requirements
For each entity:
- Required fields
- Field types and constraints
- Validation rules
- Default values
- Indexing requirements

#### 4. Relationships
- Entity relationships
- Cardinality
- Referential integrity rules
- Cascade rules

#### 5. Data Access Patterns
- Common query patterns
- Search requirements
- Sorting and filtering needs
- Performance considerations

#### 6. Security Requirements
- Access control
- Data privacy considerations
- Audit requirements
- Encryption needs

#### 7. Performance Requirements
- Expected data volume
- Growth projections
- Query performance requirements
- Caching strategies

#### 8. Additional Considerations
- Backup requirements
- Archive strategy
- Data migration needs
- Integration requirements

Your reply must start with: "\`\`\`DatabaseRequirements" and end with "\`\`\`".

Focus on creating practical, implementable database requirements that will effectively support the user experience described in the UX Datamap. Consider:

1. Data Storage & Structure:
   - Choose appropriate data types
   - Define indexes for performance
   - Plan for scalability

2. Data Integrity:
   - Define constraints
   - Establish relationships
   - Set validation rules

3. Performance & Scalability:
   - Query optimization
   - Caching strategy
   - Partitioning needs

4. Security & Compliance:
   - Access control
   - Data encryption
   - Audit requirements

5. Maintenance & Operations:
   - Backup strategy
   - Archive policy
   - Migration path`;
  },
};
