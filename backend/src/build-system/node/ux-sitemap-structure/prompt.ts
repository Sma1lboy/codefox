export const prompts = {
  generateUXSiteMapStructrePrompt: (
    projectName: string,
    sitemapDoc: string,
    platform: string,
  ): string => {
    return `You are an expert UX Designer. Your task is to analyze the provided sitemap documentation and generate a Detailed UX Structure Map to support the user experience and frontend implementation. The output should address all aspects of user interaction, content layout, based on the following inputs:
  
         - Project name: ${projectName}
         - Sitemap Documentation: ${sitemapDoc}
         - Platform: ${platform}
  
  Follow these guidelines to analyze requirements from a UX perspective:
  
  ### Instructions and Rules:
  
  1, Your job is to analyzing how the ui element should be layed out and distributed on the page based on the Sitemap Documentation.
  2, You need to ensure all features from the sitemap documentation are addressed.
  3, You need to identify and define every page/screen required for the application.
  4, Detailed Breakdown for Each Page/Screen:
    Page name: ## {index}. Name page
    Page Purpose: Clearly state the user goal for the page.
    Core Elements:
        List all components (e.g., headers, buttons, sidebars) and explain their role on the page.
        Include specific interactions and behaviors for each element.
    Content Display:
        Identify the information that needs to be visible on the page and why it's essential for the user.
    Navigation and Routes:
        Specify all frontend routes required to navigate to this page.
        Include links or actions that lead to other pages or states.
    Restrictions:
        Note any restrictions or conditions for accessing the page (e.g., login required, specific user roles).

  5, Focus on Detail:
    Provide a component-level breakdown for each page, including layouts.
    Explain how the design supports user goals and aligns with their journey.

  6. For each page/screen in the sitemap:
     - How the block should be place on the view?
     - What information does the user need to see?
     - What elements should be on the page?
     - What are all the routes require for the frontend?
     - What dynamic content needs to be displayed?
     - What are the restriction for the page?
  
  7. Consider:
     - User goals on each page
     - User journy
     - Element purposes
     - Content that needs to be displayed

  Your reply must start with: "\`\`\`UXStructureMap" and end with "\`\`\`". 

  Focus on describing the UX Structure from a user experience perspective. For each page:
  1. What element appear on each page and why
  2. What information needs to be displayed and why
  3. How the element supports user goals

  Make sure is 100% completed. It will be directly be use in development.
  `;
  },
  generateLevel2UXSiteMapStructrePrompt: (
    projectName: string,
    UXStructure: string,
    sitemapDoc: string,
    platform: string,
  ): string => {
    return `You are an expert UX Designer. 
    Your task is to analyze and improve a specific part of a page in the provided UX Structure Document.
    The goal is to refine the design, layout, and interaction to ensure a seamless user experience and facilitate frontend implementation.
    The output should address all aspects of user interaction, content layout, based on the following inputs:
  
         - Project name: ${projectName}
         - Sitemap Documentation: ${sitemapDoc}
         - UX Structure document: ${UXStructure}
         - Platform: ${platform}
  
  Follow these guidelines to analyze requirements from a UX perspective:
  
  ### Instructions and Rules:
  
  1, Analyze the Target Section:
      Focus on the specific part of the page provided in the UX Structure document.
      Identify ways to enhance its layout, interactions, and functionality.
  2, Improve UX Details:
      Add clarity to component placement and hierarchy.
      Specify interactions, behaviors, and dynamic content updates.
      Ensure the section aligns with user goals and their journey.
  3, You need to identify and define every page/screen required for the application.
  4, Detailed Breakdown for Each Page/Screen:
    Page Purpose: Clearly state the user goal for the page.
    Core Elements:
        List all components (e.g., headers, buttons, sidebars) and explain their role on the page.
        Include specific interactions and behaviors for each element.
    Content Display:
        Identify the information that needs to be visible on the page and why it’s essential for the user.
    Navigation and Routes:
        Specify all frontend routes required to navigate to this page.
        Include links or actions that lead to other pages or states.
    Restrictions:
        Note any restrictions or conditions for accessing the page (e.g., login required, specific user roles).

  5, Focus on Detail:
    Provide a component-level breakdown for each page, including layouts.
    Explain how the design supports user goals and aligns with their journey.

  6. For each page/screen in the sitemap:
     - How the block should be place on the view?
     - What information does the user need to see?
     - What elements should be on the page?
     - What are all the routes require for the frontend?
     - What dynamic content needs to be displayed?
     - What are the restriction for the page?
  
  7. Consider:
     - User goals on each page
     - User journy
     - Element purposes
     - Content that needs to be displayed

  Your reply must start with: "\`\`\`UXStructureMap" and end with "\`\`\`". 

  Focus on describing the UX Structure from a user experience perspective. For each page:
  1. What element appear on each page and why
  2. What information needs to be displayed and why
  3. How the element supports user goals

  Make sure is 100% completed. It will be directly be use in development.
  `;
  },
};
