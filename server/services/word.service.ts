import OpenAI from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface WordGenerationParams {
  keyword: string;
  count?: number;
  type?: 'synonyms' | 'related' | 'seo' | 'all';
  userId?: number;
}

export interface WordGenerationResult {
  keyword: string;
  words: string[];
  categories?: Record<string, string[]>;
}

/**
 * Generate words related to a keyword using OpenAI
 * 
 * @param params Word generation parameters
 * @returns A list of related words
 */
export async function generateWords(params: WordGenerationParams): Promise<WordGenerationResult> {
  try {
    const { keyword, count = 100, type = 'all', userId } = params;
    
    console.log('Generating words for:', {
      keyword,
      count,
      type,
      userId
    });

    // Build the prompt based on the type
    let prompt = '';
    
    if (type === 'synonyms') {
      prompt = `Generate ${count} synonyms for the keyword "${keyword}". Output as a JSON array of strings.`;
    } else if (type === 'related') {
      prompt = `Generate ${count} closely related terms for the keyword "${keyword}". Include terms that are topically related but not necessarily synonyms. Output as a JSON array of strings.`;
    } else if (type === 'seo') {
      prompt = `Generate ${count} SEO keyword suggestions for "${keyword}". Include long-tail keywords, questions, and common search terms. Output as a JSON array of strings.`;
    } else {
      // For 'all' type, generate a mix of different categories
      prompt = `Generate a comprehensive word list for the keyword "${keyword}" with the following categories:
      1. Synonyms: words with similar meaning
      2. Related Terms: topically related words
      3. SEO Keywords: search terms including long-tail variations
      4. Questions: common questions about the topic
      5. Modifiers: words commonly used with the keyword
      
      Format the output as a JSON object with these categories as keys, each containing an array of strings. Aim for around ${Math.floor(count / 5)} items per category.`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that specializes in linguistics, SEO, and keyword research. Respond only with the requested JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('No content returned from AI service');
    }

    try {
      // Parse the response based on the type
      const parsed = JSON.parse(content);
      
      if (type === 'all') {
        // For 'all' type, we expect categories
        const categories = parsed as Record<string, string[]>;
        
        // Extract all words into a flat array
        const allWords = Object.values(categories).flat();
        
        return {
          keyword,
          words: allWords,
          categories
        };
      } else {
        // For other types, we expect a simple array
        const words = Array.isArray(parsed) ? parsed : parsed.words || [];
        return {
          keyword,
          words: words.slice(0, count)
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.log('Raw content:', content);
      
      // Attempt to extract words using regex as fallback
      const words = content.match(/"([^"]+)"/g)?.map(word => word.replace(/"/g, '')) || [];
      
      return {
        keyword,
        words: words.slice(0, count)
      };
    }
  } catch (error) {
    console.error('Word generation error:', error);
    throw error;
  }
} 