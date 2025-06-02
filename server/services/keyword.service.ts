import axios from 'axios';
import type { KeywordResearchResult } from "@/lib/types";
import { db } from '../db';
import { keywordLists } from '../../db/schema';
import type { InferModel } from 'drizzle-orm';

const isDevelopment = process.env.NODE_ENV === 'development';

type Keyword = InferModel<typeof keywordLists>;

// Debug environment variables at service initialization
if (isDevelopment) {
  console.log('Keyword service initialized with environment:', {
    NODE_ENV: process.env.NODE_ENV,
    API_URL: process.env.API_URL,
  });
}

interface KeywordSearchParams {
  search_question: string;
  search_country?: string;
}

export async function researchKeywords(params: KeywordSearchParams): Promise<KeywordResearchResult[]> {
  try {
    console.log("[Keyword Service] Starting research with params:", params);

    // Validate input
    if (!params.search_question?.trim()) {
      throw new Error("Search question is required");
    }

    // Check if we should use mock data
    const shouldUseMockData = isDevelopment && !process.env.RAPIDAPI_KEY;
    if (shouldUseMockData) {
      console.warn('[Keyword Service] Using mock data in development mode');
      return [{
        keyword: params.search_question,
        searchVolume: 1000,
        difficulty: 50,
        competition: 65,
        relatedKeywords: [],
        monthlyVolume: Array.from({ length: 12 }, (_, i) => ({
          year: new Date().getFullYear(),
          month: i + 1,
          searchVolume: Math.floor(Math.random() * 2000) + 500
        }))
      }];
    }

    // Verify RapidAPI key
    if (!process.env.RAPIDAPI_KEY) {
      throw new Error("RapidAPI key is not configured. Please check your environment variables.");
    }

    // Make the API request to RapidAPI
    console.log("[Keyword Service] Making API request for keyword:", params.search_question);
    
    const response = await axios({
      method: 'GET',
      url: 'https://google-keyword-insight1.p.rapidapi.com/keysuggest/',
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY,
        'x-rapidapi-host': 'google-keyword-insight1.p.rapidapi.com'
      },
      params: {
        keyword: params.search_question,
        location: params.search_country?.split('-')[1] || 'US',
        lang: params.search_country?.split('-')[0] || 'en'
      }
    });

    if (!response.data || !Array.isArray(response.data)) {
      throw new Error("Invalid response from RapidAPI");
    }

    // Transform the RapidAPI response to match our expected format
    const keywords: KeywordResearchResult[] = response.data.map(item => ({
      keyword: item.text,
      searchVolume: item.volume || 0,
      difficulty: Math.round((item.competition_index || 0) * 100 / 100), // Convert to 0-100 scale
      competition: item.competition_level === 'HIGH' ? 100 : 
                  item.competition_level === 'MEDIUM' ? 50 : 
                  item.competition_level === 'LOW' ? 25 : 0,
      relatedKeywords: [], // RapidAPI doesn't provide related keywords
      monthlyVolume: Array.from({ length: 12 }, (_, i) => ({
        year: new Date().getFullYear(),
        month: i + 1,
        searchVolume: Math.round(item.volume * (1 + (item.trend || 0) / 100)) // Estimate monthly volume using trend
      }))
    }));

    console.log("[Keyword Service] Processed results:", keywords[0]);
    return keywords;

  } catch (error: any) {
    console.error("[Keyword Service] Research failed:", {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });

    let errorMessage = "Failed to research keywords";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    throw new Error(errorMessage);
  }
}

export async function createKeyword(data: {
  name: string;
  keywords: string[];
  source: string;
  userId: number;
  teamId?: number;
}): Promise<Keyword> {
  const [keyword] = await db.insert(keywordLists)
    .values({
      name: data.name,
      userId: data.userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return keyword;
}

export type { KeywordResearchResult };