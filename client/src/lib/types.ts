export interface InternalLink {
  url: string;
  topic: string;
}

export interface ArticleSettings {
  keyword: string;
  tone: 'professional' | 'casual' | 'friendly';
  wordCount: number;
  prompt?: string;  // Added for research-based prompts
  internalLinks?: InternalLink[];  // Optional array of internal links to include
  enableInternalLinking?: boolean; // Whether to enable internal linking
  enableExternalLinking?: boolean; // Whether to enable external linking
  userId?: number;  // Added for internal linking functionality
  callToAction?: string; // Optional call to action text
}

export interface ArticleResponse {
  content: string;
  wordCount: number;
  readingTime: number;
  settings: ArticleSettings; 
}

export type ArticleGenerationStatus = 'idle' | 'generating' | 'humanizing' | 'complete' | 'error';

export interface MonthlySearchVolume {
  year: number;
  month: number;
  searchVolume: number;
}

export interface KeywordResearchResult {
  keyword: string;
  searchVolume: number;
  difficulty?: number;
  competition?: number;
  relatedKeywords?: string[];
  monthlyVolume?: MonthlySearchVolume[];
}

export interface KeywordSearchParams {
  search_question: string;
  search_country: string;
}

// Updated to match DataForSEO response format
export interface KeywordApiResponse {
  tasks: Array<{
    result: Array<{
      items: Array<{
        keyword: string;
        search_volume: number;
        competition_index: number;
        competition_level: number;
        related_searches?: string[];
      }>;
    }>;
  }>;
}

// Add types for SerpAPI responses
export interface ResearchResult {
  summary: string;
  sources: Array<{
    title: string;
    url: string;
  }>;
  keyInsights: string[];
}