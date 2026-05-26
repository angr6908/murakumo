/**
 * Extract the current web page's base url
 * @returns base url of the page
 */
export function getBaseUrl(): string {
  return typeof window === 'undefined' ? '' : window.location.origin
}
