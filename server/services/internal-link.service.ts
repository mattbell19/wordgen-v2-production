import { DOMParser } from 'xmldom';
import axios from 'axios';

export interface InternalLink {
  url: string;
  topic: string;
  relevance: number;
}

export class InternalLinkService {
  private userLinks: Map<number, InternalLink[]> = new Map();

  // Parse sitemap XML and extract URLs
  async parseSitemap(sitemapXml: string): Promise<string[]> {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(sitemapXml, 'text/xml');
      
      // Extract URLs from sitemap
      const urls: string[] = [];
      const urlElements = xmlDoc.getElementsByTagName('url');
      
      for (let i = 0; i < urlElements.length; i++) {
        const locElement = urlElements[i].getElementsByTagName('loc')[0];
        if (locElement && locElement.textContent) {
          urls.push(locElement.textContent);
        }
      }
      
      return urls;
    } catch (error) {
      console.error('Error parsing sitemap:', error);
      return [];
    }
  }

  // Analyze page content to extract topics
  async analyzePageContent(url: string): Promise<{ url: string; topic: string }> {
    try {
      const response = await axios.get(url);
      const html = response.data;
      
      // Extract title
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      const title = titleMatch ? titleMatch[1] : '';
      
      // Extract meta description
      const descriptionMatch = html.match(/<meta name="description" content="(.*?)"/i);
      const description = descriptionMatch ? descriptionMatch[1] : '';
      
      // Extract h1 if available
      const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
      const h1 = h1Match ? h1Match[1].replace(/<[^>]*>/g, '') : '';
      
      // Combine title and h1 to determine topic
      const topic = h1 || title.split(' - ')[0] || title;
      
      return { url, topic };
    } catch (error) {
      console.error(`Error analyzing page content for ${url}:`, error);
      return { url, topic: url.split('/').pop() || url };
    }
  }

  // Store internal links for a user
  async storeUserLinks(userId: number, sitemapUrl: string): Promise<InternalLink[]> {
    try {
      // Fetch sitemap
      const response = await axios.get(sitemapUrl);
      const sitemapXml = response.data;
      
      // Parse sitemap to get URLs
      const urls = await this.parseSitemap(sitemapXml);
      
      // Analyze each URL to get topics (limit to 20 for performance)
      const urlsToProcess = urls.slice(0, 20);
      const linkPromises = urlsToProcess.map(url => this.analyzePageContent(url));
      const linkResults = await Promise.all(linkPromises);
      
      // Convert to InternalLink format with default relevance
      const links: InternalLink[] = linkResults.map(result => ({
        url: result.url,
        topic: result.topic,
        relevance: 0
      }));
      
      // Store links for this user
      this.userLinks.set(userId, links);
      
      return links;
    } catch (error) {
      console.error('Error storing user links:', error);
      return [];
    }
  }

  // Find relevant internal links for a given keyword
  async findRelevantLinks(userId: number, keyword: string, maxLinks: number = 3): Promise<InternalLink[]> {
    const userLinks = this.userLinks.get(userId) || [];
    
    if (userLinks.length === 0) {
      return [];
    }
    
    // Calculate relevance scores based on keyword match
    const scoredLinks = userLinks.map(link => {
      const topicWords = link.topic.toLowerCase().split(' ');
      const keywordWords = keyword.toLowerCase().split(' ');
      
      // Calculate word overlap
      let matchScore = 0;
      for (const word of keywordWords) {
        if (topicWords.includes(word)) {
          matchScore += 1;
        }
      }
      
      return {
        ...link,
        relevance: matchScore / keywordWords.length
      };
    });
    
    // Sort by relevance and return top matches
    return scoredLinks
      .filter(link => link.relevance > 0)
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, maxLinks);
  }
}

// Create singleton instance
export const internalLinkService = new InternalLinkService();
