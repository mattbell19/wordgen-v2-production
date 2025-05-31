import Anthropic from '@anthropic-ai/sdk';
import { env } from '../env';
import type { ArticleSettings, ArticleResponse } from '@/lib/types';

if (!env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

const anthropic = new Anthropic({
  apiKey: env.ANTHROPIC_API_KEY,
});

// Accurate word counting function
function countWords(text: string): number {
  // Remove markdown formatting
  const cleanText = text
    .replace(/#{1,6}\s+/g, '') // Remove headers
    .replace(/\*\*|\*|~~|__|\[|\]|\(|\)/g, '') // Remove formatting characters
    .replace(/\n+/g, ' ') // Replace newlines with spaces
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Split and count, filtering out empty strings
  return cleanText.split(' ').filter(word => word.length > 0).length;
}

export async function generateArticleWithClaude(settings: ArticleSettings): Promise<ArticleResponse> {
  console.log('Generating article with Claude using settings:', settings);
  
  // Calculate exact section word counts
  const introWords = Math.floor(settings.wordCount * 0.1);
  const mainContentWords = Math.floor(settings.wordCount * 0.7);
  const conclusionWords = Math.floor(settings.wordCount * 0.15);
  const referencesWords = settings.wordCount - (introWords + mainContentWords + conclusionWords);

  const systemPrompt = `You are a professional content writer. Your task is to write an article that is EXACTLY ${settings.wordCount} words long. This is a strict requirement.

Key Requirements:
1. Word count must be EXACTLY ${settings.wordCount} words - this is non-negotiable
2. Topic: "${settings.keyword}"
3. Tone: ${settings.tone}
4. Include a clear title
5. Structure with proper headings and subheadings
6. Write in a professional, engaging style
7. Include relevant statistics and examples
8. End with a strong conclusion

Section Word Counts (must be exact):
- Introduction: ${introWords} words
- Main Content: ${mainContentWords} words
- Conclusion: ${conclusionWords} words
- References: ${referencesWords} words

Count EVERY word including:
- Title
- Headings
- Main content
- Numbers and symbols
- Everything in the article`;

  try {
    console.log('Sending request to Claude with prompt length:', systemPrompt.length);
    
    const response = await anthropic.messages.create({
      model: 'claude-3-opus-20240229',
      max_tokens: 4000, // Reduced to stay within Claude's limit
      temperature: 0.3, // Reduced for more consistent output
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Write a ${settings.wordCount}-word article about "${settings.keyword}". 

Requirements:
1. EXACTLY ${settings.wordCount} words total - no exceptions
2. Professional and well-structured
3. Include relevant statistics and examples
4. Strong introduction and conclusion
5. Clear headings and subheadings

Section Requirements:
- Introduction: ${introWords} words
- Main Content: ${mainContentWords} words
- Conclusion: ${conclusionWords} words
- References: ${referencesWords} words

Add [WORD COUNT: X] after each section to track progress.`
      }]
    });

    console.log('Claude API Response:', {
      id: response.id,
      model: response.model,
      role: response.role,
      contentBlocks: response.content.length
    });

    // Handle the response content
    let content = '';
    for (const block of response.content) {
      if ('text' in block) {
        content += block.text;
      }
    }

    if (!content) {
      throw new Error('No text content received from Claude');
    }

    // Calculate actual word count using improved function
    let wordCount = countWords(content);
    console.log('Word count analysis:', {
      requested: settings.wordCount,
      actual: wordCount,
      difference: Math.abs(wordCount - settings.wordCount),
      percentageOfTarget: (wordCount / settings.wordCount * 100).toFixed(2) + '%'
    });
    
    // Stricter tolerance - only allow 0.5% deviation
    const tolerance = Math.floor(settings.wordCount * 0.005);
    if (Math.abs(wordCount - settings.wordCount) > tolerance) {
      console.log('Word count outside acceptable range, retrying with more explicit instructions...');
      
      const retryResponse = await anthropic.messages.create({
        model: 'claude-3-opus-20240229',
        max_tokens: 4000, // Reduced to stay within Claude's limit
        temperature: 0.3,
        system: `You are an expert content writer. The previous attempt produced ${wordCount} words instead of the required ${settings.wordCount} words. This is unacceptable. You must match the exact word count.`,
        messages: [{
          role: 'user',
          content: `CRITICAL: Write EXACTLY ${settings.wordCount} words about "${settings.keyword}".

Previous attempt was ${wordCount} words, which is unacceptable.

Required section lengths (must total exactly ${settings.wordCount}):
A. Introduction: ${introWords} words
B. Main Content: ${mainContentWords} words
C. Conclusion: ${conclusionWords} words
D. References: ${referencesWords} words

Instructions:
1. Use EXACTLY the section word counts above
2. Count EVERY word (including title, headings, citations)
3. Add [Section Word Count: X] after each section
4. Add [Running Total: X/${settings.wordCount}] after each section
5. Make sure total is EXACTLY ${settings.wordCount} words
6. Add [FINAL WORD COUNT: ${settings.wordCount}] at the end

Previous attempt for reference:
${content}`
        }]
      });

      let retryContent = '';
      for (const block of retryResponse.content) {
        if ('text' in block) {
          retryContent += block.text;
        }
      }

      const retryWordCount = countWords(retryContent);
      console.log('Retry word count analysis:', {
        requested: settings.wordCount,
        actual: retryWordCount,
        difference: Math.abs(retryWordCount - settings.wordCount),
        percentageOfTarget: (retryWordCount / settings.wordCount * 100).toFixed(2) + '%'
      });

      if (Math.abs(retryWordCount - settings.wordCount) < Math.abs(wordCount - settings.wordCount)) {
        console.log('Using retry content (closer to target word count)');
        content = retryContent;
        wordCount = retryWordCount;
      }
    }

    // Calculate reading time (assuming 200 words per minute)
    const readingTime = Math.ceil(wordCount / 200);

    return {
      content,
      wordCount,
      readingTime,
      settings: {
        ...settings,
        internalLinks: []
      }
    };

  } catch (error) {
    console.error('Error generating article with Claude:', error);
    throw error;
  }
}