import axios, { AxiosError } from 'axios';
import https from 'https';

export class ScrapingService {
  private agent: https.Agent;

  constructor() {
    this.agent = new https.Agent({ 
      rejectUnauthorized: false,
      timeout: 30000
    });
  }

  private normalizeDomain(url: string): string {
    try {
      const urlStr = url.toLowerCase();
      const withProtocol = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`;
      const parsedUrl = new URL(withProtocol);
      return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
    } catch (error) {
      throw new Error('Invalid domain: Please provide a valid website URL');
    }
  }

  async getSitemapXml(domain: string): Promise<string | null> {
    try {
      const normalizedDomain = this.normalizeDomain(domain);
      const sitemapUrl = new URL('/sitemap.xml', normalizedDomain).toString();

      console.log(`Fetching sitemap from: ${sitemapUrl}`);

      const response = await axios.get(sitemapUrl, {
        httpsAgent: this.agent,
        timeout: 10000,
        headers: {
          'Accept': 'application/xml, text/xml, */*'
        }
      });

      if (response.status === 200 && response.data) {
        if (typeof response.data === 'string' && 
           (response.data.includes('<?xml') || 
            response.data.includes('<urlset') || 
            response.data.includes('<sitemapindex'))) {
          console.log('Successfully fetched sitemap XML');
          return response.data;
        }
      }

      return null;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Error fetching sitemap:', axiosError.response?.status || axiosError.message);
      return null;
    }
  }
}