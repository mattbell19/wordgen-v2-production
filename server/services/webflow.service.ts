
import axios from 'axios';

export class WebflowService {
  private baseUrl = 'https://api.webflow.com/v2';
  private apiVersion = '2.0.0';

  constructor(private apiKey: string) {
    this.validateApiKey(apiKey);
  }

  private validateApiKey(apiKey: string) {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    const cleanApiKey = this.cleanApiKey(apiKey);

    if (!cleanApiKey.startsWith('site_')) {
      throw new Error(
        'Invalid API key format. Please use a site-specific API key from Webflow site settings ' +
        '(Site Settings -> Integrations). The key should start with "site_"'
      );
    }
  }

  private cleanApiKey(apiKey: string): string {
    let cleanKey = apiKey.trim();
    if (cleanKey.toLowerCase().startsWith('bearer ')) {
      cleanKey = cleanKey.substring(7);
    }
    return cleanKey;
  }

  private getHeaders() {
    const cleanApiKey = this.cleanApiKey(this.apiKey);
    return {
      'accept': 'application/json',
      'authorization': `Bearer ${cleanApiKey}`,
      'accept-version': this.apiVersion,
      'content-type': 'application/json'
    };
  }

  private handleApiError(error: any, context: string) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const data = error.response?.data;

      console.error('Webflow API Error:', {
        context,
        status,
        data,
        headers: error.response?.headers
      });

      switch (status) {
        case 401:
          throw new Error(
            'Authentication failed. Please verify that:\n' +
            '1. You\'re using a site-specific API key (starts with "site_")\n' +
            '2. The API key was generated from Site Settings -> Integrations\n' +
            '3. The API key has not expired or been revoked'
          );
        case 403:
          throw new Error('API key does not have sufficient permissions. Please enable both read and write permissions');
        case 429:
          throw new Error('Rate limit exceeded. Please try again later');
        case 404:
          throw new Error(`Resource not found: ${context}`);
        default:
          throw new Error(`Webflow API error: ${data?.message || data?.msg || error.message}`);
      }
    }
    throw new Error(`${context}: ${error.message}`);
  }

  async getSites() {
    try {
      const response = await axios.get(`${this.baseUrl}/sites`, {
        headers: this.getHeaders()
      });

      const sites = response.data?.sites;
      if (!Array.isArray(sites)) {
        throw new Error('Invalid response format from Webflow API');
      }

      if (sites.length === 0) {
        throw new Error('No sites found for this API key. Please verify you have access to the intended site');
      }

      return sites;
    } catch (error: any) {
      this.handleApiError(error, 'Failed to fetch Webflow sites');
    }
  }

  async getCollections(siteId: string) {
    try {
      const response = await axios.get(`${this.baseUrl}/sites/${siteId}/collections`, {
        headers: this.getHeaders()
      });
      return response.data.collections;
    } catch (error: any) {
      this.handleApiError(error, 'Failed to fetch collections');
    }
  }

  async createItem(collectionId: string, data: any) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/collections/${collectionId}/items`,
        { 
          fields: data,
          status: 'draft'
        },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error: any) {
      this.handleApiError(error, 'Failed to create item');
    }
  }
}
