export const prompts = {
  generatePRDPrompt: (
    projectName: string,
    description: string,
    platform: string,
  ): string => {
    return `You are an expert Product Manager. Your job is to analyze and expand upon the details provided, generating a Full Product Requirement Document (PRD) based on the following inputs:  
       - Project name: ${projectName}
       - Description: ${description}
       - Platform: ${platform}
   
Follow these guidelines to ensure clarity, thoroughness, and usability in the PRD, which will be directly utilized in development.
### Instructions and Rules:
  
1. Analyze the project requirements in detail, focusing on what matters most to users.
2. Analyze the scope and scale requirements based on the project description - determine appropriate size constraints.
3. Focus on core features for the project, prioritizing essential functionality over nice-to-haves.
4. Ask yourself:
   - What are the must-have features required for ${projectName} considering the project's scope?
   - What are the critical user stories for each core feature?
   - What specific UI dimensions and responsive design considerations are needed?
   - What are the minimum viable game mechanics needed for a satisfying user experience?
   - Who is the target audience for the project? What features would they prioritize?
   - What are the essential functional and non-functional requirements?
   - What visual elements and UI components are appropriate for this project?
   - What performance considerations are important for this type of project?
   
### PRD Structure:
Start with the following structure. Be concise and focused on implementation-ready details.
---
### Product Requirement Document
#### 1. Project Overview
  - **Project Name**: 
  - **Description**: Provide a brief overview of the project's objective and purpose.
  - **Platform**: Indicate the platform(s) (e.g., Web, Mobile).
  - **Size and Scope**: Analyze and specify appropriate dimensions, layout constraints, and responsive design considerations based on project requirements.
#### 2. Goals and Objectives
  - Define the primary goals and purpose of the project.
  - Describe any key performance indicators or success criteria.
#### 3. Target Audience
  - Identify the intended users or customer segments.
  - Describe user needs, pain points, and how the product will address them.
#### 4. User Stories
  - List essential user stories that illustrate interactions for each main feature.
  - Make each story actionable, focusing on user goals.
#### 5. Features
  - Outline each core feature required for the project.
  - Prioritize features based on user needs and project scope.
  - Write the requirement for the feature.
#### 6. Functional Requirements
  - Specify the functional requirements for each feature and sub-feature.
  - Include appropriate size and performance considerations for each requirement.
  - Use clear, concise statements outlining required functionality.
#### 7. Non-Functional Requirements
  - Describe performance, responsiveness, usability, and other quality-related requirements.
  - Include appropriate constraints and optimization requirements.
#### 8. UI/UX Specifications
  - Define the appropriate layout dimensions and structure.
  - Specify component sizes, spacing, and visual hierarchy.
  - Outline responsive design breakpoints and adaptations if applicable.
---
 Your reply must start with : "\`\`\`ProductDoc" and end with "\`\`\`". Be thorough, and make sure each section is fully developed and ready for implementation.
`;
  },
};
