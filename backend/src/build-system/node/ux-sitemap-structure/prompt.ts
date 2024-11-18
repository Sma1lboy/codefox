export const prompts = {
  generateUXDataMapPrompt: (
    projectName: string,
    sitemapDoc: string,
    platform: string,
  ): string => {
    return `You are an expert UX Designer and frountend developer. Your task is to analyze the provided sitemap documentation and identify ux structure needed to support the user experience, based on the following inputs:
  
         - Project name: ${projectName}
         - Sitemap Documentation: ${sitemapDoc}
         - Platform: ${platform}
  
  Follow these guidelines to analyze data requirements from a UX perspective:
  
  ### Instructions and Rules:
  
  1. For each page/screen in the sitemap:
     - What information does the user need to see?
     - What elements should be on the page?
     - What are all the routes require for the frontend?
     - What dynamic content needs to be displayed?
     - What are the restriction for the page?
  
  2. Consider:
     - User goals on each page
     - User journy
     - Element purposes
     - Content that needs to be displayed
     - Error states and messages

  Your reply must start with: "\`\`\`UXStructureMap" and end with "\`\`\`". 
  
  Focus on describing the UX Structure from a user experience perspective. For each page:
  1. What element appear on each page and why
  2. What information needs to be displayed and why
  3. How the element supports user goals
  `;
  },
};
