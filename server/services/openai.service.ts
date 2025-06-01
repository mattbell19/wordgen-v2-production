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

Content Structure:
1. Title:
   - Use <h1> tag
   - Include main keyword "${settings.keyword}" naturally

2. Introduction:
   - Start with a shocking stat, compelling question, or relatable scenario
   - Preview 3-4 key benefits or insights
   - Use short paragraphs with proper spacing

3. Main Content:
   - Use <h2> for major sections and <h3> for subsections
   - Add <div class="quick-takeaway"> boxes after complex sections
   - Include <div class="pro-tip"> callouts for insider advice
   - Use <ul> and <ol> for lists
   - Break down processes into clear steps
   ${externalLinks.length > 0 ? '   - Integrate external links naturally where relevant' : ''}

4. Conclusion:
   - Summarize top 2-3 actionable takeaways
   - End with a strong call-to-action
   - Keep it motivating and clear

5. References:
   - Use <div class="references"> for the reference section
   - List 4-5 current, authoritative sources
   - Include recent dates

SEO Requirements:
- Use main keyword "${settings.keyword}" 5-7 times naturally
- Include 3-4 related keywords in headers and content
- Structure content with proper heading hierarchy
- Keep paragraphs short and scannable

Content Enhancement:
1. Statistics:
   - Include 3-4 current stats with specific numbers
   - Cite credible sources
   - Use <div class="stat-highlight"> for key statistics

2. Examples:
   - Provide 2-3 detailed, relatable examples
   - Show specific numbers and outcomes
   - Use before/after scenarios when relevant

3. Visual Suggestions:
   - Use <div class="image-suggestion"> for placement recommendations
   - Suggest infographics for complex concepts
   - Recommend charts for statistics

Writing Style:
- Maintain 6th-8th grade reading level
- Use active voice
- Keep sentences under 20 words
- Explain technical terms immediately
- Use conversational transitions

Track word count internally but present a clean, professional output without word count markers or formatting notes.`
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

    // Stricter tolerance - only allow 0.5% deviation
    const tolerance = Math.floor(settings.wordCount * 0.005);
    if (Math.abs(wordCount - settings.wordCount) > tolerance) {
      console.log('Word count outside acceptable range, retrying with more explicit instructions...');
      
      const retryResponse = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert content writer. The previous attempt produced ${wordCount} words instead of the required ${settings.wordCount} words. This is unacceptable. You must match the exact word count.`
          },
          {
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
          }
        ],
        temperature: 0.3,
        max_tokens: 4000
      });

      const retryContent = retryResponse.choices[0]?.message?.content;
      if (!retryContent) {
        throw new Error('No content received from GPT retry');
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
        return {
          content: retryContent,
          wordCount: retryWordCount,
          readingTime: Math.ceil(retryWordCount / 200),
          settings: {
            ...settings,
            internalLinks: []
          }
        };
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
    console.error('Error generating article with GPT:', error);
    throw error;
  }
} 