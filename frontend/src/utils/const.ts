/**
 * @description: API URL
 * @type {string}
 * @example 'https://api.example.com'
 */
export const URL_PROTOCOL_PREFIX =
  process.env.TLS == 'false' ? 'http' : 'https';
