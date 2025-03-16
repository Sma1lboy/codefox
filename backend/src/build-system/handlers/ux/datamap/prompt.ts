export const prompts = {
  generateUXDataMapPrompt: (
    projectName: string,
    sitemapDoc: string,
    platform: string,
  ): string => {
    return `You are an expert UX Designer. Your task is to analyze the provided sitemap documentation and identify all the data elements needed to support the user experience, based on the following inputs:

       - Project name: ${projectName}
       - Sitemap Documentation: ${sitemapDoc}
       - Platform: ${platform}

Follow these guidelines to analyze data requirements from a UX perspective:

### Instructions and Rules:

1. For each page/screen in the sitemap:
   - What information does the user need to see?
   - What data does the user need to input?
   - What feedback or responses should the user receive?
   - What dynamic content needs to be displayed?

2. Consider:
   - User goals on each page
   - Required form fields and their purposes
   - Content that needs to be displayed
   - System feedback and status information
   - Dynamic updates and real-time data
   - Error states and messages

### UX Data Requirements Document:

---
### Page-by-Page Data Analysis

#### 1. Project Overview
  - **Project Name**: 
  - **Platform**: 
  - **General Description**:

#### 2. Global Data Elements
Common data elements needed across multiple pages:
  - User profile information
  - Navigation states
  - System status
  - etc.

#### 3. Page-Specific Data Requirements

For each page in sitemap:

##### [Page Name]
**Purpose**: [Brief description of page purpose]

**User Goals**:
- Goal 1
- Goal 2
...

**Required Data Elements**:

*Input Data*:
- Field 1: [Purpose and importance]
  - Why it's needed
  - User expectations
  - Requirements (if any)
- Field 2: ...

*Display Data*:
- Content 1: [Purpose and importance]
  - Why users need this information
  - Update frequency (if dynamic)
  - Priority level
- Content 2: ...

*Feedback & States*:
- Success states
- Error states
- Loading states
- Empty states

**User Interactions**:
- How data changes based on user actions
- What feedback is needed
- When/how data updates
---

Your reply must start with: "\`\`\`UXDataMap" and end with "\`\`\`". 

Focus on describing the data requirements from a user experience perspective. For each page:
1. What data needs to be collected and why
2. What information needs to be displayed and why
3. How the data supports user goals
4. What feedback the user needs`;
  },
};
