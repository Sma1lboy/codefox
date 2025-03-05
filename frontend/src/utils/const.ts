/**
 * @description: API URL
 * @type {string}
 * @example 'https://api.example.com'
 */
export const URL_PROTOCOL_PREFIX =
  process.env.TLS == 'false' ? 'http' : 'https';

/**
 * Validate if the current environment is using TLS
 */
export const TLS = process.env.TLS == 'true';
