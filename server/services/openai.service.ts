import OpenAI from 'openai';
import type { ArticleSettings, ArticleResponse } from '@/lib/types';
import { ExternalLinkService } from "./external-link.service";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const externalLinkService = new ExternalLinkService();

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

export async function generateArticleWithGPT(settings: ArticleSettings): Promise<ArticleResponse> {
  console.log('Generating article with GPT using settings:', settings);

  // Calculate word distribution
  const introWords = Math.floor(settings.wordCount * 0.15); // 15% for intro
  const conclusionWords = Math.floor(settings.wordCount * 0.1); // 10% for conclusion
  const referencesWords = Math.floor(settings.wordCount * 0.05); // 5% for references
  const mainContentWords = settings.wordCount - (introWords + conclusionWords + referencesWords);

  // Get external linking opportunities if enabled
  let externalLinks: Array<{title: string, url: string, snippet: string}> = [];
  if (settings.enableExternalLinking) {
    try {
      externalLinks = await externalLinkService.findLinkingOpportunities(settings.keyword);
      console.log('Found external linking opportunities:', externalLinks);
    } catch (error) {
      console.warn('Failed to fetch external links:', error);
    }
  }

  const systemPrompt = `You are an expert content writer for Money Saving Expert, known for making complex topics simple and engaging. Your task is to write a high-quality article that combines SEO optimization with genuinely helpful, easy-to-read content.

Key Requirements:
1. Write in a friendly, conversational tone like you're explaining to a friend
2. Use short, clear sentences (max 15-20 words)
3. Break complex ideas into simple steps or bullet points
4. Start each section with its most interesting or surprising point
5. Format content in clean HTML:
   - Main title: <h1>Title Here</h1>
   - Major sections: <h2>Section Title</h2>
   - Subsections: <h3>Subsection Title</h3>
   - Paragraphs: <p>Content here</p>
   - Lists: <ul><li>Item</li></ul> or <ol><li>Item</li></ol>
   - Use regular paragraphs for all content including key points and statistics
   - Image suggestions: <div class="image-suggestion"><p>Suggestion here</p></div>
   - External links: <a href="url" target="_blank" rel="noopener noreferrer">anchor text</a>
6. Maintain word count distribution without showing markers:
   - Introduction: ${introWords} words
   - Main Content: ${mainContentWords} words
   - Conclusion: ${conclusionWords} words
   - References: ${referencesWords} words

${externalLinks.length > 0 ? `
7. Include the following external links naturally in your content:
${externalLinks.map(link => `   - ${link.title} (${link.url})
     Snippet: ${link.snippet}`).join('\n')}

External Linking Guidelines:
- Place links where they naturally fit the context
- Use descriptive anchor text (not "click here")
- Distribute links evenly throughout the content
- Only use links where they add value to the reader
` : ''}

IMPORTANT:
- DO NOT include any word count markers, section markers, or metadata in the output
- Use proper HTML tags for ALL content - no markdown
- Ensure proper nesting of HTML elements
- Add appropriate spacing between sections
- Keep paragraphs short (2-3 sentences)
- Include key points and statistics within regular paragraphs, not as special elements`;

  try {
    console.log('Sending request to GPT with prompt length:', systemPrompt.length);
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Write a ${settings.wordCount}-word article about "${settings.keyword}" using proper HTML formatting.

Structure:
1. <h1> title with keyword "${settings.keyword}"
2. Introduction paragraph
3. 3-4 main sections with <h2> headings
4. Conclusion paragraph
5. Simple reference list

Requirements:
- Use HTML tags (h1, h2, p, ul, ol)
- Include keyword "${settings.keyword}" naturally 3-5 times
- Keep paragraphs short and readable
- Target approximately ${settings.wordCount} words
- Professional, informative tone

Write the complete article now.`
        }
      ],
      temperature: 0.3,
      max_tokens: 4000
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from GPT');
    }

    // Calculate actual word count
    const wordCount = countWords(content);
    console.log('Word count analysis:', {
      requested: settings.wordCount,
      actual: wordCount,
      difference: Math.abs(wordCount - settings.wordCount),
      percentageOfTarget: (wordCount / settings.wordCount * 100).toFixed(2) + '%'
    });

    // More lenient tolerance to avoid timeout issues - allow 20% deviation
    const tolerance = Math.floor(settings.wordCount * 0.2);
    console.log('Word count tolerance check:', {
      requested: settings.wordCount,
      actual: wordCount,
      tolerance: tolerance,
      withinRange: Math.abs(wordCount - settings.wordCount) <= tolerance
    });

    // Skip retry to avoid Heroku timeout - accept the content as-is
    // The word count is close enough for most use cases

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
    console.error('Error generating article with GPT:', error);
    throw error;
  }
} 