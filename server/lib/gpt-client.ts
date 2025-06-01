import OpenAI from 'openai';
import { ArticleCreationParams } from '../services/article.service';
import { internalLinkService } from '../services/internal-link.service';
import { ExternalLinkService } from '../services/external-link.service';
import { searchUsageService } from '../services/search-usage.service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize external link service
const externalLinkService = new ExternalLinkService();

// Accurate word counting function
function countWords(text: string): number {
  // Remove HTML formatting
  const cleanText = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/\s+/g, ' ') // Normalize spaces
    .trim();

  // Split and count, filtering out empty strings
  return cleanText.split(' ').filter(word => word.length > 0).length;
}

/**
 * Generate article content using OpenAI GPT
 *
 * @param params Article creation parameters
 * @returns Generated article content
 */
export async function generateArticle(params: ArticleCreationParams): Promise<string> {
  try {
    // Convert ArticleCreationParams to match the expected format
    const {
      title,
      keyword,
      keywords = [keyword || title || ''],
      wordCount,
      tone,
      callToAction,
      structure
    } = params;

    // Use keyword or title as the main topic
    const mainTopic = keyword || title || '';

    console.log('Generating article with OpenAI using settings:', params);

    // Calculate word distribution
    const introWords = Math.floor(wordCount * 0.15); // 15% for intro
    const mainContentWords = Math.floor(wordCount * 0.7); // 70% for main content
    const conclusionWords = wordCount - (introWords + mainContentWords);

    // Get internal links if enabled
    let internalLinks: Array<{url: string; topic: string; relevance: number}> = [];
    if (params.enableInternalLinking && params.userId) {
      try {
        // First check if the user has any stored links
        const allUserLinks = await internalLinkService.findRelevantLinks(params.userId, '', 100);

        if (allUserLinks.length > 0) {
          // User has links, so find relevant ones for this topic
          internalLinks = await internalLinkService.findRelevantLinks(params.userId, mainTopic);
          console.log('Found internal linking opportunities:', internalLinks);
        } else {
          console.log('User has not added a sitemap yet, skipping internal linking');
        }
      } catch (error) {
        console.warn('Failed to fetch internal links:', error);
      }
    }

    // Get external links if enabled
    let externalLinks: Array<{url: string; title: string; relevance: number; authority: number; snippet: string}> = [];
    if (params.enableExternalLinking && params.userId) {
      try {
        // Check if user has search quota remaining
        const hasQuota = await searchUsageService.hasSearchQuotaRemaining(params.userId);

        if (hasQuota) {
          // User has quota, perform search (or use cache)
          externalLinks = await externalLinkService.findLinkingOpportunities(mainTopic);

          // Only increment usage if we actually performed a search (not from cache)
          if (externalLinks.length > 0) {
            await searchUsageService.incrementSearchUsage(params.userId);
          }

          console.log('Found external linking opportunities:', externalLinks);
        } else {
          console.log('User has reached their search quota limit for external linking');
        }
      } catch (error) {
        console.warn('Failed to fetch external links:', error);
      }
    }

    // Create an enhanced detailed prompt
    // Default structure settings if not provided
    const defaultStructure = {
      sections: {
        whatIs: true,
        whyMatters: true,
        howTo: true,
        bestPractices: true,
        challenges: true,
        caseStudies: false,
        comparison: false,
        futureTrends: false,
      },
      visualElements: {
        quickTakeaways: true,
        proTips: true,
        statHighlights: true,
        comparisonTables: true,
        calloutBoxes: true,
        imageSuggestions: true,
      },
      seoFeatures: {
        tableOfContents: true,
        faqSection: true,
        relatedTopics: true,
        metaDescription: true,
      },
      contentStyle: {
        tone: tone,
        readingLevel: 'intermediate',
        contentDensity: 3,
        targetAudience: 'general',
      },
    };

    // Merge with provided structure or use defaults
    const articleStructure = {
      sections: { ...defaultStructure.sections, ...structure?.sections },
      visualElements: { ...defaultStructure.visualElements, ...structure?.visualElements },
      seoFeatures: { ...defaultStructure.seoFeatures, ...structure?.seoFeatures },
      contentStyle: { ...defaultStructure.contentStyle, ...structure?.contentStyle },
    };

    // Get content style settings
    const contentStyle = articleStructure.contentStyle;
    const readingLevel = contentStyle.readingLevel || 'intermediate';
    const contentDensity = contentStyle.contentDensity || 3;
    const targetAudience = contentStyle.targetAudience || 'general';

    // Build sections list based on structure
    const sectionsList = [];
    if (articleStructure.sections.whatIs) sectionsList.push('"What is [Topic]" section that defines and explains the concept');
    if (articleStructure.sections.whyMatters) sectionsList.push('"Why [Topic] Matters" section that explains benefits and importance');
    if (articleStructure.sections.howTo) sectionsList.push('"How to Use [Topic]" section with implementation steps');
    if (articleStructure.sections.bestPractices) sectionsList.push('"Best Practices" section with tips and recommendations');
    if (articleStructure.sections.challenges) sectionsList.push('"Common Challenges" section with problems and solutions');
    if (articleStructure.sections.caseStudies) sectionsList.push('"Case Studies/Examples" section with real-world applications');
    if (articleStructure.sections.comparison) sectionsList.push('"Comparison" section that compares with alternatives');
    if (articleStructure.sections.futureTrends) sectionsList.push('"Future Trends" section with upcoming developments');

    // Build visual elements list based on structure
    const visualElementsList = [];
    if (articleStructure.visualElements.quickTakeaways) visualElementsList.push('Quick takeaways: <div class="quick-takeaway"><p>Key point here</p></div>');
    if (articleStructure.visualElements.proTips) visualElementsList.push('Pro tips: <div class="pro-tip"><p>Expert advice here</p></div>');
    if (articleStructure.visualElements.statHighlights) visualElementsList.push('Statistics: <div class="stat-highlight"><p>Important statistic: X% of users...</p></div>');
    if (articleStructure.visualElements.comparisonTables) visualElementsList.push('Comparison tables: <div class="comparison-table"><table>...</table></div>');
    if (articleStructure.visualElements.calloutBoxes) visualElementsList.push('Callout boxes: <div class="callout-box"><h4>Important Note</h4><p>Content here</p></div>');
    if (articleStructure.visualElements.imageSuggestions) visualElementsList.push('Image suggestions: <div class="image-suggestion">Suggest an image of [description]</div>');

    // Build SEO features list based on structure
    const seoFeaturesList = [];
    if (articleStructure.seoFeatures.tableOfContents) seoFeaturesList.push('Include proper heading structure for table of contents generation');
    if (articleStructure.seoFeatures.faqSection) seoFeaturesList.push('Include frequently asked questions related to the topic');
    if (articleStructure.seoFeatures.relatedTopics) seoFeaturesList.push('Include related topics and LSI keywords');
    if (articleStructure.seoFeatures.metaDescription) seoFeaturesList.push('Include a meta description suggestion at the end');

    const systemPrompt = `You are an expert content writer for a professional website, known for making complex topics simple and engaging. Your task is to write a high-quality, comprehensive article that combines SEO optimization with genuinely helpful, easy-to-read content that provides real value to readers.

Key Requirements:
1. Write in a ${tone} tone that remains authoritative and professional
   - Reading level: ${readingLevel}
   - Content density: ${contentDensity > 3 ? 'Comprehensive and detailed' : contentDensity < 3 ? 'Concise and to-the-point' : 'Balanced'}
   - Target audience: ${targetAudience}

2. Use proper HTML formatting:
   - Main title: <h1>Title Here</h1>
   - Major sections: <h2>Section Title</h2>
   - Subsections: <h3>Subsection Title</h3>
   - Paragraphs: <p>Content here</p>
   - Lists: <ul><li>Item</li></ul> or <ol><li>Item</li></ol>
   - Blockquotes: <blockquote>Quote text</blockquote>
   - Tables: <table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>

3. Word Count Distribution (${wordCount} total words):
   - Introduction: ${introWords} words
   - Main Content: ${mainContentWords} words
   - Conclusion: ${conclusionWords} words

4. Article Structure:
   - Introduction (always include)
   ${sectionsList.map(section => '   - ' + section).join('\n')}
   - Conclusion (always include)

5. Include these special content elements:
   ${visualElementsList.map(element => '   - ' + element).join('\n')}

6. SEO Requirements:
   - Primary keyword "${mainTopic}" used 5-7 times naturally
   - Related keywords: ${keywords.join(', ')}
   ${seoFeaturesList.map(feature => '   - ' + feature).join('\n')}
   - Optimize headings for search intent
   - Keep paragraphs short (2-3 sentences)
   ${articleStructure.seoFeatures.metaDescription ? '   - Include a meta description suggestion at the end: <div class="meta-suggestion"><p>Suggested meta description here</p></div>' : ''}

6. Enhanced Content Structure:
   - Title: Create a compelling, benefit-driven title under 70 characters
   - Introduction: Start with a powerful hook (surprising statistic, compelling question, or relatable scenario)
   - Main Content: Break into clear, logical sections with H2 and H3 headings
   - Include at least:
     * A "What is [Topic]" section with clear definition
     * A "Why [Topic] Matters" section with benefits
     * A "How to" or "Best Practices" section with actionable advice
     * A "Common Challenges" or "FAQs" section addressing reader pain points
     * At least one comparison table for related concepts or options
     * 2-3 image suggestions at appropriate points in the article
   - Conclusion: Summarize key points, reinforce main benefits, and include call to action

7. Call to Action:
${callToAction ? `   Include this specific call to action in a styled box: <div class="call-to-action"><h3>Ready to Get Started?</h3><p>${callToAction}</p></div>` : '   End with a natural call to action in a styled box: <div class="call-to-action"><h3>Ready to Get Started?</h3><p>Encourage reader to take the next step with specific, actionable guidance.</p></div>'}

IMPORTANT:
- Write in a clear, conversational style that builds trust and authority
- Use active voice and direct address ("you") to engage readers
- Support all claims with evidence, examples, or logical reasoning
- Format everything in proper HTML with semantic structure
- Ensure content is factually accurate, comprehensive, and genuinely helpful
- Include real-world examples and case studies where appropriate
- Do not include any word count markers or metadata
- Focus on providing actionable value that readers can implement immediately`;

    // Add linking instructions if links are available
    let linkingInstructions = '';

    if (internalLinks.length > 0) {
      linkingInstructions += `

Internal Linking Instructions:
- Include ${internalLinks.length} internal links in the article
- Use the following internal links naturally within the content:
${internalLinks.map(link => `  - Link to: ${link.url} using anchor text related to: "${link.topic}"`).join('\n')}
- Format internal links as: <a href="URL">anchor text</a>`;
    }

    if (externalLinks.length > 0) {
      linkingInstructions += `

External Linking Instructions:
- Include ${Math.min(externalLinks.length, 3)} external links to authoritative sources
- Use the following external links naturally within the content:
${externalLinks.slice(0, 3).map(link => `  - Link to: ${link.url} with title: "${link.title}"`).join('\n')}
- Format external links as: <a href="URL" target="_blank" rel="noopener noreferrer">anchor text</a>`;
    }

    // Append linking instructions to the system prompt
    const systemPromptWithLinks = systemPrompt + linkingInstructions;

    // For development/testing: Check if we're in development mode and OPENAI_API_KEY is not set or set to test
    if (process.env.NODE_ENV === 'development' &&
        (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY.includes('test'))) {
      console.log('Using mock article content in development mode');

      // Generate a placeholder article with the requested word count
      const placeholderContent = `
        <h1>${mainTopic} - Comprehensive Guide</h1>

        <p>Welcome to our comprehensive guide about ${mainTopic}. This article will provide you with all the essential information you need.</p>

        <h2>Understanding ${mainTopic}</h2>

        <p>${mainTopic} has become increasingly important in today's market. Many businesses are now focusing on optimizing their strategies related to this topic.</p>

        <div class="quick-takeaway"><p>Understanding ${mainTopic} is critical for business success in 2025.</p></div>

        <h2>Key Benefits of ${mainTopic}</h2>

        <ul>
          <li>Improved customer engagement</li>
          <li>Higher conversion rates</li>
          <li>Better market positioning</li>
          <li>Increased revenue potential</li>
        </ul>

        <div class="stat-highlight"><p>Businesses implementing ${mainTopic} strategies see an average of 45% growth in customer acquisition.</p></div>

        <h2>How to Implement ${mainTopic} Strategies</h2>

        <p>Implementing effective ${mainTopic} strategies requires careful planning and execution. Here are some steps to follow:</p>

        <ol>
          <li>Conduct thorough market research</li>
          <li>Develop a comprehensive strategy</li>
          <li>Execute with precision and consistency</li>
          <li>Measure results and optimize accordingly</li>
        </ol>

        <div class="pro-tip"><p>Always start with a pilot program before full-scale implementation of your ${mainTopic} strategy.</p></div>

        <h2>Common Challenges with ${mainTopic}</h2>

        <p>Despite its benefits, implementing ${mainTopic} strategies isn't without challenges. Some common obstacles include:</p>

        <ul>
          <li>Resource constraints</li>
          <li>Lack of expertise</li>
          <li>Market competition</li>
          <li>Rapidly changing trends</li>
        </ul>

        <h2>Conclusion</h2>

        <p>${mainTopic} represents a significant opportunity for businesses looking to grow and expand. By understanding its fundamentals and implementing effective strategies, you can leverage its potential for substantial business growth.</p>

        <p>We encourage you to start exploring how ${mainTopic} can benefit your specific business context today.</p>
      `;

      return placeholderContent;
    }

    // Call OpenAI API
    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPromptWithLinks
          },
          {
            role: 'user',
            content: `Write a comprehensive ${wordCount}-word article about "${mainTopic}". The article should be engaging, clear, and optimized for SEO while providing valuable information that addresses readers' questions and challenges related to the topic.`
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const content = response.choices[0]?.message?.content;

      if (!content) {
        throw new Error('No content received from OpenAI');
      }

      // Calculate actual word count
      const actualWordCount = countWords(content);
      console.log('Article generated with word count:', {
        requested: wordCount,
        actual: actualWordCount,
        difference: Math.abs(actualWordCount - wordCount),
        percentageOfTarget: (actualWordCount / wordCount * 100).toFixed(2) + '%'
      });

      return content;
    } catch (apiError) {
      console.error('Error calling OpenAI API, falling back to placeholder content:', apiError);

      // Fall back to placeholder content in case of API error
      const fallbackContent = `
        <h1>${mainTopic} - Essential Guide</h1>

        <p>Welcome to our guide about ${mainTopic}. This article provides key information about this important topic.</p>

        <h2>What is ${mainTopic}?</h2>

        <p>${mainTopic} refers to strategies and techniques used by businesses to improve their market position and customer acquisition.</p>

        <div class="quick-takeaway"><p>Understanding the basics of ${mainTopic} can transform your business approach.</p></div>

        <h2>Why ${mainTopic} Matters</h2>

        <p>In today's competitive landscape, implementing effective ${mainTopic} strategies can make the difference between success and failure.</p>

        <h2>Conclusion</h2>

        <p>We hope this guide has helped you understand the importance of ${mainTopic}. Start implementing these strategies today.</p>
      `;

      return fallbackContent;
    }
  } catch (error) {
    console.error('Error in article generation process:', error);

    // Final fallback in case of any other errors
    const emergencyContent = `
      <h1>${params.title || params.keyword || 'Article'}</h1>
      <p>This is a placeholder article about the requested topic. The actual content generation is currently unavailable.</p>
      <p>Please try again later or contact support if the issue persists.</p>
    `;

    return emergencyContent;
  }
}