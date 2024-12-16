import * as fs from 'fs';
import * as path from 'path';
/**
 * Utility function to write content to a file in a clean, formatted manner.
 * @param handlerName - The name of the handler.
 * @param data - The data to be written to the file.
 */
export const writeToFile = (
  rootPath: string,
  handlerName: string,
  data: string | object,
): void => {
  try {
    // Sanitize handler name to prevent illegal file names
    const sanitizedHandlerName = handlerName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filePath = path.join(rootPath, `${sanitizedHandlerName}.md`);

    // Generate clean and readable content
    const formattedContent = formatContent(data);

    // Write the formatted content to the file
    fs.writeFileSync(filePath, formattedContent, 'utf8');
    console.log(`Successfully wrote data for ${handlerName} to ${filePath}`);
  } catch (error) {
    console.error(`Failed to write data for ${handlerName}:`, error);
    throw error;
  }
};

/**
 * Formats the content for writing to the file.
 * @param data - The content to format (either a string or an object).
 * @returns A formatted string.
 */
export const formatContent = (data: string | object): string => {
  if (typeof data === 'string') {
    // Remove unnecessary escape characters and normalize newlines
    return data
      .replace(/\\n/g, '\n') // Handle escaped newlines
      .replace(/\\t/g, '\t'); // Handle escaped tabs
  } else if (typeof data === 'object') {
    // Pretty-print JSON objects with 2-space indentation
    return JSON.stringify(data, null, 2);
  } else {
    // Convert other types to strings
    return String(data);
  }
};
