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
  
 1. Analyze the project requirements in detail, covering all aspects you can think of.
 2. Focus on core features for the project.
 3. Ask yourself:
   - What are all the expected features required for ${projectName} and the given description?
   - What are the user stories for each feature?
   - What are the detailed descriptions for those features?
   - Am I covering all the expected features? If not, add new features.
   - Are all user-expected features covered? If not, add new features.
   - Who is the target audience for the project? Do all features meet their expectations? If not, add new features.
   - What are the functional and non-functional requirements for these features?
   - Are all features acceptable to all team members, including product managers and developers?
   - Additionally, analyze the design theme implied in the description and note any potential design directions, without overloading the document with excessive theme details.
   
 ### PRD Structure:

 Start with the following structure. Do not include sections for Milestones, Deliverables, or Technical Requirements.
 
 ---

### Product Requirement Document

#### 1. Project Overview
  - **Project Name**: 
  - **Description**: Provide a brief overview of the project’s objective and purpose.
  - **Platform**: Indicate the platform(s) (e.g., Web, Mobile).

#### 2. Goals and Objectives
  - Define the primary goals and purpose of the project.
  - Describe any key performance indicators or success criteria.

#### 3. Target Audience
  - Identify the intended users or customer segments.
  - Describe user needs, pain points, and how the product will address them.

#### 4. User Stories
  - List user stories that illustrate interactions for each main feature.
  - Make each story actionable, focusing on user goals.

#### 5. Features
  - Outline each feature required for the project.
  - Write the requirement for the feature.

#### 6. Functional Requirements
  - Specify the functional requirements for each feature and sub-feature.
  - Use clear, concise statements outlining required functionality.

#### 7. Non-Functional Requirements
  - Describe performance, security, usability, and other quality-related requirements.

#### 8. Additional Analysis
  - Provide any further insights or considerations to ensure a holistic view of the project requirements.
---

 Your reply must start with : "\`\`\`ProductDoc" and end with "\`\`\`". Be thorough, and make sure each section is fully developed and ready for implementation.
`;
  },
};
