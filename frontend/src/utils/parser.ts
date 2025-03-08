export const parseXmlToJson = (xmlString: string) => {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const jsonText = xmlDoc.getElementsByTagName('jsonResponse')[0]?.textContent;

  if (!jsonText) {
    throw new Error('Invalid XML: No <jsonResponse> element found');
  }

  return JSON.parse(jsonText);
};
