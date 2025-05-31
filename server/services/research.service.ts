import axios from 'axios'
import { env } from '../env'

interface ResearchResult {
  title: string
  snippet: string
  link: string
}

interface ResearchSummary {
  topResults: ResearchResult[]
  relatedQuestions: string[]
  relatedKeywords: string[]
  statistics: string[]
}

interface SerpResult {
  title: string
  snippet: string
  link: string
}

interface SerpResponse {
  organic_results: SerpResult[]
  related_questions?: { question: string }[]
  related_searches?: { query: string }[]
}

export async function researchKeyword(keyword: string): Promise<ResearchSummary> {
  try {
    // Fetch SERP results
    const response = await axios.get<SerpResponse>('https://serpapi.com/search', {
      params: {
        q: keyword,
        api_key: env.SERPAPI_KEY,
        num: 10 // Get top 10 results
      }
    })

    const data = response.data

    // Extract relevant information
    const topResults = data.organic_results.map((result: SerpResult) => ({
      title: result.title,
      snippet: result.snippet,
      link: result.link
    }))

    const relatedQuestions = data.related_questions?.map(q => q.question) || []
    const relatedKeywords = data.related_searches?.map(s => s.query) || []
    
    // Extract statistics from snippets
    const statistics = topResults
      .map(result => result.snippet)
      .join(' ')
      .match(/\d+(?:\.\d+)?%|\$?\d+(?:,\d{3})*(?:\.\d+)?/g) || []

    return {
      topResults: topResults.slice(0, 5), // Keep top 5 most relevant results
      relatedQuestions: relatedQuestions.slice(0, 5),
      relatedKeywords: relatedKeywords.slice(0, 5),
      statistics: Array.from(new Set(statistics)).slice(0, 5) // Deduplicate and keep top 5
    }
  } catch (error: any) {
    console.error('Research error:', error)
    throw new Error(`Failed to research keyword: ${error.message}`)
  }
} 