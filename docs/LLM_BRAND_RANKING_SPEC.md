# LLM Brand Ranking & Tracking Feature - Technical Specification

## Overview

The LLM Brand Ranking feature will track how well brands perform in responses from multiple Large Language Models (Claude, ChatGPT, Gemini). This feature helps users understand their brand visibility and positioning in AI-generated content, providing competitive insights and tracking trends over time.

## Business Value

### Primary Use Cases
1. **Brand Visibility Monitoring**: Track where and how often brands appear in LLM responses
2. **Competitive Intelligence**: Compare brand positioning against competitors across different AI models
3. **Topic Association Analysis**: Understand what topics trigger brand mentions
4. **Trend Tracking**: Monitor ranking changes over time
5. **Multi-Model Comparison**: Analyze brand performance differences across LLM providers

### Target Users
- Marketing teams monitoring brand perception
- SEO professionals tracking AI content impact
- Brand managers analyzing competitive positioning
- Agencies providing brand monitoring services

## Technical Architecture

### System Components

#### 1. Multi-LLM Client Layer
```typescript
interface LLMClient {
  provider: 'openai' | 'claude' | 'gemini';
  queryBrand(query: BrandQuery): Promise<LLMResponse>;
  getBrandMentions(response: string, brands: string[]): BrandMention[];
}

interface BrandQuery {
  template: string;
  brands: string[];
  industry?: string;
  context?: string;
}
```

#### 2. Brand Analysis Engine
```typescript
interface BrandAnalysisEngine {
  extractMentions(response: string, brands: string[]): BrandMention[];
  calculateRanking(mentions: BrandMention[]): BrandRanking;
  analyzeSentiment(mention: BrandMention): SentimentScore;
  compareCompetitors(rankings: BrandRanking[]): CompetitorAnalysis;
}
```

#### 3. Data Storage Layer
- **brand_profiles**: User's tracked brands and configurations
- **llm_brand_queries**: Query logs and raw responses
- **brand_rankings**: Processed ranking data with scores
- **brand_competitors**: Competitive relationship mapping
- **brand_tracking_sessions**: Batch analysis campaigns

### Database Schema

```sql
-- Brand profiles table
CREATE TABLE brand_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  brand_name VARCHAR(255) NOT NULL,
  description TEXT,
  industry_category VARCHAR(100),
  tracking_keywords TEXT[], -- Related keywords to test
  competitors TEXT[], -- Known competitor names
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- LLM query logs
CREATE TABLE llm_brand_queries (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES brand_tracking_sessions(id),
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  brand_id INTEGER REFERENCES brand_profiles(id),
  llm_provider VARCHAR(50) NOT NULL, -- 'openai', 'claude', 'gemini'
  query_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  query_type VARCHAR(100), -- 'recommendation', 'comparison', 'industry_leader'
  response_metadata JSONB, -- tokens, model version, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- Processed brand rankings
CREATE TABLE brand_rankings (
  id SERIAL PRIMARY KEY,
  query_id INTEGER REFERENCES llm_brand_queries(id),
  brand_id INTEGER REFERENCES brand_profiles(id),
  competitor_brand_id INTEGER REFERENCES brand_profiles(id),
  mention_position INTEGER, -- Position of first mention (1st, 2nd, etc.)
  mention_count INTEGER DEFAULT 0,
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  context_quality VARCHAR(50), -- 'positive', 'neutral', 'negative'
  ranking_score DECIMAL(5,2), -- Calculated overall score
  is_mentioned BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Competitive analysis data
CREATE TABLE brand_competitors (
  id SERIAL PRIMARY KEY,
  brand_id INTEGER REFERENCES brand_profiles(id),
  competitor_name VARCHAR(255) NOT NULL,
  relationship_type VARCHAR(50), -- 'direct', 'indirect', 'substitute'
  auto_detected BOOLEAN DEFAULT false,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tracking sessions for batch analysis
CREATE TABLE brand_tracking_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  session_name VARCHAR(255) NOT NULL,
  brands_tracked INTEGER[], -- Array of brand_profile ids
  query_template_id INTEGER,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
  results_summary JSONB,
  total_queries INTEGER DEFAULT 0,
  completed_queries INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

-- Query templates for reusable prompts
CREATE TABLE brand_query_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_text TEXT NOT NULL,
  category VARCHAR(100), -- 'recommendation', 'comparison', 'industry'
  industry_specific VARCHAR(100),
  is_public BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### Brand Management
```typescript
// POST /api/brand-ranking/brands
// Create new brand profile
interface CreateBrandRequest {
  brandName: string;
  description?: string;
  industryCategory?: string;
  trackingKeywords?: string[];
  competitors?: string[];
}

// GET /api/brand-ranking/brands
// List user's brand profiles
interface ListBrandsResponse {
  brands: BrandProfile[];
  total: number;
}

// PUT /api/brand-ranking/brands/:id
// Update brand profile
interface UpdateBrandRequest extends Partial<CreateBrandRequest> {}

// DELETE /api/brand-ranking/brands/:id
// Delete brand profile
```

### Ranking Analysis
```typescript
// POST /api/brand-ranking/analyze
// Start new brand ranking analysis
interface AnalyzeBrandRequest {
  brandIds: number[];
  llmProviders: ('openai' | 'claude' | 'gemini')[];
  queryTemplates: number[];
  sessionName?: string;
}

// GET /api/brand-ranking/sessions/:id
// Get analysis session status and results
interface SessionResponse {
  session: TrackingSession;
  progress: {
    total: number;
    completed: number;
    status: string;
  };
  results?: BrandRankingResults;
}

// GET /api/brand-ranking/rankings
// Get current brand rankings
interface GetRankingsRequest {
  brandId?: number;
  llmProvider?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  limit?: number;
  offset?: number;
}
```

### Analytics & Reporting
```typescript
// GET /api/brand-ranking/analytics/trends
// Get historical ranking trends
interface TrendsRequest {
  brandIds: number[];
  period: 'week' | 'month' | 'quarter';
  llmProvider?: string;
}

// GET /api/brand-ranking/analytics/competitors
// Get competitive analysis
interface CompetitorAnalysisRequest {
  brandId: number;
  includeAutoDetected?: boolean;
  limit?: number;
}

// POST /api/brand-ranking/reports/generate
// Generate comprehensive report
interface GenerateReportRequest {
  brandIds: number[];
  reportType: 'executive' | 'detailed' | 'competitive';
  format: 'pdf' | 'csv' | 'json';
  dateRange?: {
    start: string;
    end: string;
  };
}
```

## User Interface Components

### 1. Brand Dashboard
**Location**: `/brand-tracking`
**Components**:
- Overview cards showing key metrics
- Quick stats grid (total brands, average ranking, recent changes)
- Recent activity feed
- Action buttons for new analysis

### 2. Brand Setup Wizard
**Components**:
- Brand information form
- Industry selection dropdown
- Competitor input with auto-suggestions
- Query template selection
- Preview and confirmation

### 3. Rankings Dashboard
**Components**:
- LLM provider tabs (OpenAI, Claude, Gemini)
- Brand ranking cards with scores and trends
- Comparison tables
- Filter and sort controls

### 4. Analytics & Trends
**Components**:
- Time series charts for ranking history
- Heatmap visualization for performance patterns
- Trend analysis with insights
- Comparative charts for multiple brands

### 5. Competitor Analysis
**Components**:
- Head-to-head comparison tables
- Market positioning charts
- Gap analysis visualization
- Opportunity identification dashboard

### 6. Reporting Interface
**Components**:
- Report configuration form
- Preview functionality
- Export options (PDF, CSV)
- Scheduled report setup

## Implementation Phases

### Phase 1: MVP (4-6 weeks)
**Goal**: Basic brand tracking with OpenAI integration
- [ ] Database schema implementation
- [ ] Brand profile management
- [ ] OpenAI query system
- [ ] Basic ranking calculation
- [ ] Simple dashboard interface

**Deliverables**:
- Users can create brand profiles
- Manual analysis with OpenAI
- Basic ranking display
- Simple export functionality

### Phase 2: Multi-LLM Support (3-4 weeks)
**Goal**: Add Claude and Gemini integration
- [ ] Claude API integration
- [ ] Gemini API integration
- [ ] Unified response processing
- [ ] Multi-provider comparison interface

**Deliverables**:
- Support for all three LLM providers
- Comparative analysis across models
- Provider-specific insights

### Phase 3: Advanced Analytics (4-5 weeks)
**Goal**: Historical tracking and advanced insights
- [ ] Historical data storage
- [ ] Trend analysis algorithms
- [ ] Advanced visualization components
- [ ] Automated competitor detection

**Deliverables**:
- Historical trend tracking
- Predictive insights
- Automated competitive intelligence
- Advanced reporting

### Phase 4: Enterprise Features (3-4 weeks)
**Goal**: Automation and enterprise capabilities
- [ ] Automated monitoring schedules
- [ ] Custom query templates
- [ ] API access for integrations
- [ ] White-label reporting

**Deliverables**:
- Scheduled monitoring
- Template marketplace
- External API
- Enterprise reporting

## Query Templates

### Recommendation Queries
```
"What are the top 5 {industry} companies I should consider for {use_case}?"
"Which {industry} tools would you recommend for {specific_need}?"
"What are the best alternatives to {competitor} in the {industry} space?"
```

### Comparison Queries
```
"Compare {brand} vs {competitor} in terms of {criteria}"
"What are the pros and cons of {brand_list}?"
"Which is better: {brand_a} or {brand_b} for {use_case}?"
```

### Industry Leadership Queries
```
"Who are the market leaders in {industry}?"
"What companies are innovating in {industry_sector}?"
"Which {industry} companies have the best reputation?"
```

## Ranking Algorithm

### Base Scoring System
```typescript
interface RankingScore {
  positionScore: number;    // Higher for earlier mentions (1st = 100, 2nd = 90, etc.)
  frequencyScore: number;   // Based on mention count
  sentimentScore: number;   // Positive sentiment = higher score
  contextScore: number;     // Quality of context (recommendation vs mention)
  competitiveScore: number; // Performance vs competitors
  finalScore: number;       // Weighted combination of above
}

function calculateRankingScore(mention: BrandMention): number {
  const weights = {
    position: 0.35,
    frequency: 0.20,
    sentiment: 0.25,
    context: 0.15,
    competitive: 0.05
  };
  
  return (
    mention.positionScore * weights.position +
    mention.frequencyScore * weights.frequency +
    mention.sentimentScore * weights.sentiment +
    mention.contextScore * weights.context +
    mention.competitiveScore * weights.competitive
  );
}
```

## Security & Privacy

### Data Protection
- All brand data encrypted at rest
- User-specific data isolation
- Secure API key management for LLM providers
- Regular data purging for inactive accounts

### Rate Limiting
- Per-user query limits based on subscription tier
- LLM provider rate limiting with intelligent queuing
- Usage tracking and billing integration

### Access Control
- Role-based permissions for team accounts
- Brand-level access controls
- Audit logging for all operations

## Monitoring & Observability

### Metrics to Track
- Query success rates per LLM provider
- Average response times
- User engagement with features
- Analysis session completion rates
- Error rates and types

### Alerts
- LLM provider API failures
- Unusual ranking changes
- High error rates
- Quota exhaustion warnings

## Testing Strategy

### Unit Tests
- Brand analysis algorithms
- Ranking calculation logic
- LLM client integrations
- Database operations

### Integration Tests
- End-to-end analysis workflows
- Multi-provider query processing
- Report generation pipeline
- API endpoint functionality

### Performance Tests
- Large-scale brand analysis
- Concurrent user scenarios
- Database query optimization
- LLM provider response handling

## Success Metrics

### User Adoption
- Number of active brand profiles
- Analysis sessions per user
- Feature usage distribution
- User retention rates

### Business Impact
- Revenue from brand tracking subscriptions
- User upgrade rates to higher tiers
- Customer satisfaction scores
- Feature request fulfillment

### Technical Performance
- System uptime and reliability
- Query processing speed
- Data accuracy validation
- Cost per analysis

This specification provides a comprehensive roadmap for implementing the LLM Brand Ranking feature while integrating seamlessly with the existing WordGen platform architecture. 