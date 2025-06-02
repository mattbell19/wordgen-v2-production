import OpenAI from 'openai';
import type { ArticleSettings, ArticleResponse } from '@/lib/types';
import { ExternalLinkService } from "./external-link.service";
import ExpertPersonasService, { type IndustryContext } from './expert-personas.service';
import ContentQualityService from './content-quality.service';
import RealTimeDataService, { type RealTimeContext } from './real-time-data.service';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Validate OpenAI API key
function validateOpenAIKey(): void {
  if (!process.env.OPENAI_API_KEY ||
      process.env.OPENAI_API_KEY === 'your_openai_api_key_here' ||
      process.env.OPENAI_API_KEY.length < 10) {
    throw new Error('OpenAI API key is not properly configured. Please set a valid OPENAI_API_KEY environment variable.');
  }
}

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

// Helper function to infer industry from keyword
function inferIndustryFromKeyword(keyword: string): string {
  const lowerKeyword = keyword.toLowerCase();

  // AI/Tech keywords
  if (lowerKeyword.includes('ai') || lowerKeyword.includes('artificial intelligence') ||
      lowerKeyword.includes('machine learning') || lowerKeyword.includes('automation') ||
      lowerKeyword.includes('software') || lowerKeyword.includes('saas') ||
      lowerKeyword.includes('tech') || lowerKeyword.includes('api')) {
    return 'ai_saas';
  }

  // Finance keywords
  if (lowerKeyword.includes('finance') || lowerKeyword.includes('investment') ||
      lowerKeyword.includes('money') || lowerKeyword.includes('tax') ||
      lowerKeyword.includes('loan') || lowerKeyword.includes('credit') ||
      lowerKeyword.includes('banking') || lowerKeyword.includes('insurance')) {
    return 'finance';
  }

  // Marketing keywords
  if (lowerKeyword.includes('marketing') || lowerKeyword.includes('seo') ||
      lowerKeyword.includes('advertising') || lowerKeyword.includes('social media') ||
      lowerKeyword.includes('content') || lowerKeyword.includes('brand')) {
    return 'marketing';
  }

  // E-commerce keywords
  if (lowerKeyword.includes('ecommerce') || lowerKeyword.includes('e-commerce') ||
      lowerKeyword.includes('online store') || lowerKeyword.includes('shopify') ||
      lowerKeyword.includes('amazon') || lowerKeyword.includes('retail')) {
    return 'ecommerce';
  }

  // Healthcare keywords
  if (lowerKeyword.includes('health') || lowerKeyword.includes('medical') ||
      lowerKeyword.includes('doctor') || lowerKeyword.includes('patient') ||
      lowerKeyword.includes('hospital') || lowerKeyword.includes('treatment')) {
    return 'healthcare';
  }

  // Default to marketing for general business topics
  return 'marketing';
}

export async function generateArticleWithGPT(settings: ArticleSettings): Promise<ArticleResponse> {
  console.log('🚀 Generating enhanced article with expert prompts:', settings);

  // Track generation start time for timeout management
  const startTime = Date.now();

  // Validate OpenAI API key first
  try {
    validateOpenAIKey();
  } catch (error: any) {
    console.error('OpenAI API key validation failed:', error.message);
    throw new Error('AI service is not properly configured. Please contact support.');
  }

  // Validate required settings
  if (!settings.keyword) {
    throw new Error('Invalid settings: keyword is required');
  }

  if (!settings.wordCount || settings.wordCount < 100 || settings.wordCount > 5000) {
    throw new Error('Invalid settings: wordCount must be between 100 and 5000');
  }

  if (!settings.tone) {
    throw new Error('Invalid settings: tone is required');
  }

  // Determine industry context
  const industryContext: IndustryContext = {
    industry: settings.industry || inferIndustryFromKeyword(settings.keyword),
    targetAudience: settings.targetAudience || settings.tone,
    contentType: settings.contentType || 'guide',
    businessStage: 'growth'
  };

  console.log('📊 Industry context determined:', industryContext);

  // Get expert persona for this industry
  const expertPersona = ExpertPersonasService.getExpertPersona(industryContext);
  console.log('👨‍💼 Expert persona selected:', expertPersona.name);

  // Get real-time context data
  let realTimeContext: RealTimeContext;
  try {
    realTimeContext = await RealTimeDataService.getRealTimeContext(
      settings.keyword,
      industryContext.industry,
      industryContext.targetAudience
    );
    console.log('📈 Real-time data fetched successfully');
  } catch (error) {
    console.warn('⚠️ Failed to fetch real-time data, using defaults:', error);
    realTimeContext = await RealTimeDataService.getRealTimeContext(settings.keyword, industryContext.industry);
  }

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
      console.log('🔗 Found external linking opportunities:', externalLinks.length);
    } catch (error) {
      console.warn('⚠️ Failed to fetch external links:', error);
    }
  }

  // Generate enhanced system prompt with expert persona
  const expertIntro = ExpertPersonasService.generateExpertIntro(expertPersona, settings.keyword);
  const realTimeDataPrompt = RealTimeDataService.formatForPrompt(realTimeContext);
  const industryTerminology = ExpertPersonasService.getIndustryTerminology(industryContext.industry);
  const commonMistakes = ExpertPersonasService.getCommonMistakes(industryContext.industry);
  const successMetrics = ExpertPersonasService.getSuccessMetrics(industryContext.industry);

  const systemPrompt = `${expertIntro}

**EXPERT PERSONA & CREDENTIALS:**
- Name: ${expertPersona.name}
- Expertise: ${expertPersona.expertise}
- Experience: ${expertPersona.experience}
- Writing Style: ${expertPersona.writingStyle}

**CONTENT QUALITY REQUIREMENTS (Target Score: 85+/100):**

1. **Expert Authority (Target: 85+)**
   - Include specific credentials and experience markers
   - Reference real case studies and examples from your experience
   - Use industry-specific terminology: ${industryTerminology.slice(0, 5).join(', ')}
   - Cite specific metrics, ROI data, and performance statistics
   - Include quotes or insights from industry leaders

2. **Actionability (Target: 85+)**
   - Provide step-by-step implementation guides
   - Include specific tools and resources: ${expertPersona.credibilityMarkers.slice(0, 3).join(', ')}
   - Add downloadable templates or checklists
   - Give concrete next steps and action items
   - Include implementation timelines and milestones

3. **Specificity (Target: 85+)**
   - Use specific numbers, percentages, and dollar amounts
   - Name real companies and case studies
   - Include exact timeframes and deadlines
   - Provide specific tool recommendations with versions
   - Avoid vague language like "many," "some," "often"

4. **Current Relevance (Target: 85+)**
   - Reference 2024 trends and developments
   - Include latest industry statistics and data
   - Mention recent events and market changes
   - Use current examples and case studies
   - Address emerging challenges and opportunities

5. **Content Structure & Format:**
   - Main title: <h1>Title Here</h1>
   - Major sections: <h2>Section Title</h2>
   - Subsections: <h3>Subsection Title</h3>
   - Paragraphs: <p>Content here</p>
   - Lists: <ul><li>Item</li></ul> or <ol><li>Item</li></ol>
   - Tables for data: <table><tr><th>Header</th></tr><tr><td>Data</td></tr></table>
   - External links: <a href="url" target="_blank" rel="noopener noreferrer">anchor text</a>

6. **Word Count Distribution:**
   - Introduction: ${introWords} words
   - Main Content: ${mainContentWords} words
   - Conclusion: ${conclusionWords} words
   - References: ${referencesWords} words

**MANDATORY CONTENT SECTIONS:**
1. **Expert Introduction** - Establish credibility immediately
2. **Current Market Context** - Include 2024 data and trends
3. **Common Mistakes Section** - Address these specific mistakes: ${commonMistakes.slice(0, 3).join(', ')}
4. **Success Metrics & ROI** - Include these metrics: ${successMetrics.slice(0, 3).join(', ')}
5. **Step-by-Step Implementation Guide** - Actionable steps with timelines
6. **Tools & Resources Section** - Specific recommendations with links
7. **Real-World Examples** - At least 3 specific case studies
8. **Future Trends & Predictions** - What's coming next in ${industryContext.industry}

${realTimeDataPrompt}

${externalLinks.length > 0 ? `
**EXTERNAL LINKS TO INCLUDE:**
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
    console.log('Using OpenAI API key:', process.env.OPENAI_API_KEY ? `${process.env.OPENAI_API_KEY.substring(0, 10)}...` : 'NOT SET');

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

    let content = response.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from GPT');
    }

    console.log('✅ Initial content generated, analyzing quality...');

    // Analyze content quality
    const qualityAnalysis = await ContentQualityService.analyzeContentQuality(
      content,
      [settings.keyword],
      industryContext.industry,
      industryContext.targetAudience
    );

    console.log('📊 Quality Analysis Results:', {
      overall_score: qualityAnalysis.metrics.overall_score,
      expert_authority: qualityAnalysis.metrics.expert_authority,
      actionability: qualityAnalysis.metrics.actionability,
      specificity: qualityAnalysis.metrics.specificity,
      current_relevance: qualityAnalysis.metrics.current_relevance
    });

    // Check if content meets quality threshold (80+)
    if (!ContentQualityService.meetsQualityThreshold(qualityAnalysis)) {
      // Check if we're running out of time - skip improvement if so
      const timeElapsed = Date.now() - startTime;
      if (timeElapsed > 20000 || settings.wordCount > 1200) {
        console.log('⚠️ Skipping quality improvement to prevent timeout. Time elapsed:', timeElapsed + 'ms', 'Word count:', settings.wordCount);

        // Calculate word count for early return
        const wordCount = countWords(content);

        return {
          content: content,
          wordCount: wordCount,
          readingTime: Math.ceil(wordCount / 200),
          settings,
          qualityMetrics: qualityAnalysis.metrics,
          expertPersona: expertPersona.name,
          industry: industryContext.industry
        };
      }

      console.log('⚠️ Content quality below threshold, attempting improvement...');

      // Generate improvement prompt
      const improvementPrompt = `
**CONTENT QUALITY IMPROVEMENT REQUIRED**

Current Quality Score: ${qualityAnalysis.metrics.overall_score}/100 (Target: 80+)

**Issues Identified:**
${qualityAnalysis.weaknesses.map(weakness => `- ${weakness}`).join('\n')}

**Missing Elements:**
${qualityAnalysis.missing_elements.map(element => `- ${element}`).join('\n')}

**Improvement Recommendations:**
${qualityAnalysis.recommendations.map(rec => `- ${rec}`).join('\n')}

**INSTRUCTIONS:**
Rewrite the content to address ALL the issues above. Focus on:
1. Adding specific examples and case studies
2. Including concrete data and statistics
3. Providing actionable implementation steps
4. Establishing expert authority with credentials
5. Adding current 2024 trends and data

Maintain the same structure but significantly enhance the quality and depth.
      `;

      try {
        const improvementResponse = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: improvementPrompt
            },
            {
              role: 'assistant',
              content: content
            },
            {
              role: 'user',
              content: 'Please improve this content based on the feedback above.'
            }
          ],
          temperature: 0.3,
          max_tokens: 4000
        });

        const improvedContent = improvementResponse.choices[0]?.message?.content;
        if (improvedContent) {
          content = improvedContent;
          console.log('✅ Content improved successfully');

          // Re-analyze improved content
          const improvedAnalysis = await ContentQualityService.analyzeContentQuality(
            content,
            [settings.keyword],
            industryContext.industry,
            industryContext.targetAudience
          );

          console.log('📈 Improved Quality Score:', improvedAnalysis.metrics.overall_score);
        }
      } catch (error) {
        console.warn('⚠️ Content improvement failed, using original:', error);
      }
    } else {
      console.log('✅ Content quality meets threshold!');
    }

    // Calculate actual word count
    const wordCount = countWords(content);
    console.log('📝 Final word count analysis:', {
      requested: settings.wordCount,
      actual: wordCount,
      difference: Math.abs(wordCount - settings.wordCount),
      percentageOfTarget: (wordCount / settings.wordCount * 100).toFixed(2) + '%',
      qualityScore: qualityAnalysis.metrics.overall_score
    });

    // Calculate reading time (assuming 200 words per minute)
    const readingTime = Math.ceil(wordCount / 200);

    console.log('🎉 Enhanced article generation complete!', {
      expertPersona: expertPersona.name,
      industry: industryContext.industry,
      qualityScore: qualityAnalysis.metrics.overall_score,
      wordCount,
      readingTime
    });

    return {
      content,
      wordCount,
      readingTime,
      settings: {
        ...settings,
        internalLinks: []
      },
      qualityMetrics: {
        overall_score: qualityAnalysis.metrics.overall_score,
        expert_authority: qualityAnalysis.metrics.expert_authority,
        actionability: qualityAnalysis.metrics.actionability,
        specificity: qualityAnalysis.metrics.specificity,
        current_relevance: qualityAnalysis.metrics.current_relevance,
        engagement: qualityAnalysis.metrics.engagement
      },
      expertPersona: expertPersona.name,
      industry: industryContext.industry
    };

  } catch (error: any) {
    console.error('Error generating article with GPT:', {
      message: error.message,
      status: error.status,
      code: error.code,
      type: error.type
    });

    // Provide more specific error messages
    if (error.status === 400) {
      throw new Error('Invalid request to AI service. Please check your input parameters.');
    } else if (error.status === 401) {
      throw new Error('AI service authentication failed. Please check API configuration.');
    } else if (error.status === 429) {
      throw new Error('AI service rate limit exceeded. Please try again later.');
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new Error('Unable to connect to AI service. Please try again later.');
    } else if (error.message?.includes('timeout')) {
      throw new Error('AI service request timed out. Please try again with a shorter word count.');
    } else {
      throw new Error(`AI service error: ${error.message || 'Unknown error occurred'}`);
    }
  }
} 