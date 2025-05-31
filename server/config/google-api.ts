/**
 * Google API Configuration
 *
 * This file contains configuration for Google API integration,
 * including OAuth settings for Google Search Console.
 */

export const googleApiConfig = {
  // OAuth 2.0 credentials
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/gsc/callback',

  // API scopes required for Google Search Console
  scopes: [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'profile',
    'email'
  ],

  // Google Search Console API settings
  searchConsole: {
    apiEndpoint: 'https://searchconsole.googleapis.com/webmasters/v3',
    defaultDateRange: {
      // Default to last 28 days
      startDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    // Default dimensions for performance queries
    defaultDimensions: ['query', 'page', 'device', 'country'],
    // Default row limit for API requests
    rowLimit: 1000,
    // Cache time for API responses (in seconds)
    cacheTtl: 3600
  }
};

/**
 * Generate OAuth URL for Google Search Console authorization
 */
export function generateAuthUrl(state: string): string {
  const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth';
  const params = new URLSearchParams({
    client_id: googleApiConfig.clientId,
    redirect_uri: googleApiConfig.redirectUri,
    response_type: 'code',
    scope: googleApiConfig.scopes.join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state
  });

  return `${baseUrl}?${params.toString()}`;
}

/**
 * Validate Google API configuration
 */
export function validateGoogleApiConfig(): boolean {
  if (!googleApiConfig.clientId) {
    console.error('Missing GOOGLE_CLIENT_ID environment variable');
    return false;
  }

  if (!googleApiConfig.clientSecret) {
    console.error('Missing GOOGLE_CLIENT_SECRET environment variable');
    return false;
  }

  if (!googleApiConfig.redirectUri) {
    console.error('Missing GOOGLE_REDIRECT_URI environment variable');
    return false;
  }

  return true;
}
