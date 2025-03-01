export const parseXmlToJson = (xmlString: string) => {
  // 使用正则提取 <jsonResponse>...</jsonResponse> 之间的内容
  console.log(xmlString);
  const match = xmlString.match(/<jsonResponse>([\s\S]*?)<\/jsonResponse>/);
  console.log(match);
  console.log(match[1]);
  if (!match || !match[1]) {
    throw new Error('Invalid XML: No <jsonResponse> element found');
  }

  const jsonText = match[1].trim(); // 去除首尾空白字符
  console.log(jsonText);

  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      'Invalid JSON: Failed to parse content inside <jsonResponse>' + error
    );
  }
};
