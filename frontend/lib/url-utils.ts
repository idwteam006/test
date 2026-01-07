/**
 * URL Validation Utilities
 * Provides secure URL validation to prevent XSS attacks
 */

// Allowed domains for receipt URLs (add your S3/CDN domains here)
const ALLOWED_RECEIPT_DOMAINS = [
  'amazonaws.com',
  's3.amazonaws.com',
  'cloudfront.net',
  'localhost',
  '127.0.0.1',
];

/**
 * Validates if a URL is safe to open/display
 * @param url - The URL to validate
 * @returns boolean indicating if the URL is valid and safe
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Validates if a receipt URL is from an allowed domain
 * @param url - The receipt URL to validate
 * @returns boolean indicating if the URL is from an allowed domain
 */
export function isValidReceiptUrl(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Check protocol
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return false;
    }

    // Check if hostname matches any allowed domain
    const hostname = parsed.hostname.toLowerCase();
    return ALLOWED_RECEIPT_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

/**
 * Safely opens a URL in a new tab with security attributes
 * @param url - The URL to open
 * @returns boolean indicating if the URL was opened
 */
export function safeOpenUrl(url: string): boolean {
  if (!isValidUrl(url)) {
    console.warn('Attempted to open invalid URL:', url);
    return false;
  }

  // Use noopener and noreferrer for security
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

/**
 * Sanitizes a URL for safe display
 * @param url - The URL to sanitize
 * @returns The sanitized URL or empty string if invalid
 */
export function sanitizeUrl(url: string): string {
  if (!isValidUrl(url)) {
    return '';
  }

  try {
    const parsed = new URL(url);
    // Return the href which will be properly encoded
    return parsed.href;
  } catch {
    return '';
  }
}
