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

**COMPETITOR-LEVEL CONTENT QUALITY REQUIREMENTS (Target Score: 90+/100):**

1. **Clarity & Accessibility (Target: 90+)**
   - Explain complex topics in simple, understandable language
   - Use clear definitions for technical terms and jargon
   - Structure information logically from basic to advanced concepts
   - Include relevant examples that readers can easily relate to
   - Maintain professional tone while being approachable and helpful
   - Use industry-specific terminology: ${industryTerminology.slice(0, 5).join(', ')} when appropriate

2. **Practical Actionability (Target: 90+)**
   - Provide specific, implementable steps and processes
   - Include exact figures, rates, and official requirements where relevant
   - Reference authoritative sources: ${expertPersona.credibilityMarkers.slice(0, 3).join(', ')}
   - Give clear guidance on documentation and preparation needed
   - Address common challenges and provide practical solutions
   - Include both immediate actions and long-term considerations

3. **Comprehensive Coverage (Target: 90+)**
   - Address the topic from multiple relevant angles and perspectives
   - Include eligibility criteria, processes, and potential challenges
   - Cover common misconceptions and provide clear corrections
   - Explain both benefits and limitations honestly
   - Provide context for why the topic matters to the reader
   - Include specific examples and real-world scenarios

4. **Authority & Credibility (Target: 90+)**
   - Reference official sources, government agencies, and regulatory bodies
   - Use current and accurate information with proper context
   - Include specific rates, deadlines, and official terminology
   - Mention relevant legislation, policies, or industry standards
   - Provide balanced perspective that acknowledges complexities
   - Demonstrate deep understanding of the subject matter

5. **Reader-Focused Value (Target: 90+)**
   - Anticipate and answer likely reader questions proactively
   - Address common pain points and concerns directly
   - Provide both overview information and detailed guidance
   - Include tips for avoiding common mistakes or pitfalls
   - Offer guidance on when to seek professional help
   - Make complex processes feel manageable and achievable

6. **Enhanced Content Structure & Format:**
   - Main title: <h1>Title Here</h1> (include power words and emotional triggers)
   - Major sections: <h2>Section Title</h2> (use benefit-driven headings)
   - Subsections: <h3>Subsection Title</h3> (include numbers and specifics)
   - Paragraphs: <p>Content here</p> (max 3 sentences, scannable)
   - Enhanced lists: <ul><li>Item with specific benefit/outcome</li></ul>
   - Data tables: <table><tr><th>Metric</th><th>Before</th><th>After</th></tr></table>
   - External links: <a href="url" target="_blank" rel="noopener noreferrer">descriptive anchor text</a>
   - Call-out boxes: <div class="callout-box">Important insight or tip</div>
   - Statistics highlights: <div class="stat-highlight">Key statistic with context</div>

7. **Word Count Distribution:**
   - Introduction: ${introWords} words (hook + credibility + preview)
   - Main Content: ${mainContentWords} words (detailed implementation)
   - Conclusion: ${conclusionWords} words (summary + next steps)
   - References: ${referencesWords} words (authoritative sources)

**MANDATORY ENHANCED CONTENT SECTIONS:**
1. **Expert Introduction** - Establish credibility with specific achievements and recognition
2. **Current Market Context** - Include 2024 data, trends, and market analysis with sources
3. **Common Mistakes Section** - Address these specific mistakes: ${commonMistakes.slice(0, 3).join(', ')} with real examples
4. **Success Metrics & ROI** - Include these metrics: ${successMetrics.slice(0, 3).join(', ')} with benchmarks
5. **Step-by-Step Implementation Guide** - Detailed actionable steps with time estimates and success criteria
6. **Tools & Resources Section** - Specific recommendations with pricing, alternatives, and integration guides
7. **Real-World Case Studies** - At least 3 detailed examples with company names, challenges, solutions, and results
8. **Advanced Strategies** - Beyond-basic techniques for experienced practitioners
9. **Troubleshooting Guide** - Common challenges and solutions during implementation
10. **Future Trends & Predictions** - What's coming next in ${industryContext.industry} with expert forecasts
11. **Competitive Analysis** - How this approach compares to alternatives
12. **ROI Calculator/Framework** - Specific methods to measure success and calculate return

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
          content: `Write a comprehensive ${settings.wordCount}-word article about "${settings.keyword}" using proper HTML formatting and enhanced visual elements.

**INTELLIGENT STRUCTURE SELECTION:**
First, analyze the keyword "${settings.keyword}" and choose the most appropriate format:

**FORMAT A - UNIVERSAL GUIDE STRUCTURE** (Use for: processes, regulations, services, complex topics, legal/financial content):
1. <h1> "Understanding ${settings.keyword}: A Comprehensive Guide"
2. "What is ${settings.keyword}?" (200-250 words)
   - Clear definition and context
   - Why it matters to the reader
   - Key benefits or implications
3. "The basics of ${settings.keyword}" (250-300 words)
   - Fundamental concepts explained simply
   - Key terminology and definitions
   - Important rates, figures, or standards
4. "Who is eligible/affected by ${settings.keyword}?" (200-250 words)
   - Specific criteria and requirements
   - Real-world examples of qualifying situations
   - Important exclusions or limitations
5. "The process of [implementing/using] ${settings.keyword}" (400-500 words)
   - Step-by-step breakdown with H3 subsections
   - Preparation requirements
   - Implementation process
   - Required documentation or tools
6. "Common misconceptions about ${settings.keyword}" (300-350 words)
   - "Debunking myths" subsection
   - "Understanding the realities" subsection
   - Clear fact vs fiction comparisons
7. "The impact of ${settings.keyword} on [relevant area]" (250-300 words)
   - Immediate effects and benefits
   - Long-term implications
   - Financial or practical considerations
8. "Navigating potential challenges with ${settings.keyword}" (200-250 words)
   - Common issues and solutions
   - When to seek professional help
   - Best practices for success

**FORMAT B - TECHNICAL/TUTORIAL STRUCTURE** (Use for: technical topics, how-to guides, tools, specifications, sizing, optimization):
1. <h1> "What is the ${settings.keyword}" or "${settings.keyword}: Complete Guide"
2. "Understanding ${settings.keyword}" (250-300 words)
   - Importance and why it matters
   - Impact on performance/results
   - Key considerations for success
3. "[Platform/System] Guidelines for ${settings.keyword}" (200-250 words)
   - Official requirements and standards
   - Recommended specifications
   - Important technical details
4. "Different Types/Categories of ${settings.keyword}" (400-500 words)
   - Breakdown by type/category with H3 subsections
   - Specific requirements for each type
   - Technical specifications and dimensions
   - Best practices for each category
5. "Common Mistakes with ${settings.keyword}" (300-350 words)
   - "Problems with [oversized/incorrect] approach" subsection
   - "Issues with [undersized/wrong] method" subsection
   - Consequences and impact of mistakes
6. "Optimizing Your ${settings.keyword}" (250-300 words)
   - Tools and resources for improvement
   - Tips for high-quality results
   - Best practices and recommendations
7. "Frequently Asked Questions About ${settings.keyword}" (200-250 words)
   - How to check/verify your approach
   - What to do when things don't work
   - Troubleshooting common issues

**FORMAT SELECTION CRITERIA:**
Choose FORMAT A (Universal Guide) for keywords related to:
- Legal/regulatory topics (tax, compliance, regulations)
- Financial services (loans, insurance, investments)
- Business processes (hiring, management, operations)
- Government services (benefits, applications, permits)
- Complex procedures (immigration, licensing, certification)

Choose FORMAT B (Technical/Tutorial) for keywords related to:
- Technical specifications (sizes, dimensions, requirements)
- Software/platform features (tools, settings, optimization)
- How-to guides (setup, configuration, implementation)
- Design/creative topics (templates, formats, standards)
- Performance optimization (speed, quality, efficiency)

**COMPETITOR-LEVEL CONTENT QUALITY REQUIREMENTS:**
- Write in clear, accessible language that explains complex topics simply
- Include specific rates, figures, and official terminology where relevant
- Reference authoritative sources (government agencies, official bodies, platforms)
- Provide practical, actionable advice with concrete steps
- Address common misconceptions and clarify confusing points
- Use real-world examples and scenarios readers can relate to
- Maintain professional tone while being approachable and helpful
- Include both immediate and long-term perspectives on the topic

**ENHANCED VISUAL ELEMENTS (Use Strategically):**
- <div class="callout-box">Important clarifications or warnings</div>
- <div class="pro-tip"><h4>Expert Insight</h4><p>Professional advice or insider knowledge</p></div>
- <div class="quick-takeaway"><h4>Key Point</h4><p>Essential information to remember</p></div>
- Tables for comparing rates, requirements, specifications, or processes
- Bulleted lists for step-by-step processes, criteria, or technical specs
- Clear subsection breaks with H3 headings for complex topics

**WRITING STYLE REQUIREMENTS:**
- Use HTML tags (h1, h2, h3, p, ul, ol, table, div) properly
- Include keyword "${settings.keyword}" naturally 4-6 times throughout
- Write paragraphs of 2-4 sentences for optimal readability
- Target exactly ${settings.wordCount} words
- Maintain authoritative yet accessible tone
- End each section with clear takeaways or next steps
- Use transition sentences to connect sections smoothly
- Include specific examples and scenarios throughout

**CRITICAL SUCCESS FACTORS:**
- Ensure every section provides genuine value to the reader
- Address the reader's likely questions and concerns proactively
- Provide both overview and detailed information as needed
- Make complex processes feel manageable and understandable
- Include practical tips that readers can implement immediately
- Match the depth and quality of top-performing competitor content

**IMPORTANT:** Analyze the keyword "${settings.keyword}" and select the most appropriate format (A or B) based on the criteria above. Then write the complete article following that format's structure and maintaining competitor-level quality standards.`
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