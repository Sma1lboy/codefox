/**
 * @description: API URL
 * @type {string}
 * @example 'https://api.example.com'
 */
/**
 * Always use HTTPS when the page is loaded over HTTPS
 */
export const URL_PROTOCOL_PREFIX =
  typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? 'https'
    : process.env.TLS == 'false'
      ? 'http'
      : 'https';

/**
 * Validate if the current environment is using TLS
 */
export const TLS =
  typeof window !== 'undefined' && window.location.protocol === 'https:'
    ? true
    : process.env.TLS == 'true';
