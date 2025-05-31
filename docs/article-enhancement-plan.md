# Article Generation Enhancement Plan

## Overview
We'll enhance the article generation system with three major features:
1. External linking opportunities
2. Internal linking from sitemaps
3. CTA template integration

## Current System Analysis
- The system already has sitemap analysis capability
- Internal linking is partially implemented but needs enhancement
- Article generation uses GPT-4 with a well-structured prompt system
- The system supports article settings and customization

## Implementation Progress

### Phase 1: External Linking [IN PROGRESS]
- [ ] Create ExternalLinkService
- [ ] Implement web search integration
- [ ] Add link validation and ranking
- [ ] Update article generation prompt
- [ ] Add tests

### Phase 2: Internal Linking Enhancement [PENDING]
- [ ] Enhance existing sitemap integration
- [ ] Implement InternalLinkManager
- [ ] Add content relevance matching
- [ ] Improve link placement logic
- [ ] Add tests

### Phase 3: CTA System [PENDING]
- [ ] Create CTA database schema
- [ ] Implement CTA management UI
- [ ] Update article generation
- [ ] Add CTA positioning logic
- [ ] Add tests

## Technical Details

### External Linking Implementation
```typescript
interface ExternalLink {
  url: string;
  title: string;
  relevance: number;
  authority: number;
  snippet: string;
}

class ExternalLinkService {
  async findLinkingOpportunities(keyword: string): Promise<ExternalLink[]>;
  async validateLinks(links: ExternalLink[]): Promise<ExternalLink[]>;
  async rankLinks(links: ExternalLink[]): Promise<ExternalLink[]>;
}
```

### Internal Linking Implementation
```typescript
interface InternalLinkSuggestion {
  sourceUrl: string;
  anchorText: string;
  relevance: number;
  context: string;
}

class InternalLinkManager {
  async analyzeSitemap(sitemapXml: string): Promise<void>;
  async suggestLinks(content: string): Promise<InternalLinkSuggestion[]>;
  async validateSuggestions(suggestions: InternalLinkSuggestion[]): Promise<InternalLinkSuggestion[]>;
}
```

### CTA System Implementation
```typescript
interface CTATemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  position: 'top' | 'middle' | 'bottom' | 'smart';
}

class CTAManager {
  async saveTemplate(template: CTATemplate): Promise<void>;
  async getTemplates(userId: string): Promise<CTATemplate[]>;
  async injectCTA(content: string, template: CTATemplate): Promise<string>;
}
```

## Database Schema Updates

### CTA Templates Table
```sql
CREATE TABLE cta_templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  template TEXT NOT NULL,
  variables JSONB,
  position TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## API Endpoints

### CTA Management
```typescript
POST /api/cta/templates - Create new template
GET /api/cta/templates - List templates
PUT /api/cta/templates/:id - Update template
DELETE /api/cta/templates/:id - Delete template
```

### Enhanced Article Generation
```typescript
POST /api/ai/article/generate
{
  keyword: string;
  enableExternalLinking: boolean;
  enableInternalLinking: boolean;
  ctaTemplate?: {
    id: string;
    variables: Record<string, string>;
  };
  // ... existing fields
}
```

## Testing Strategy

### Unit Tests
- External link validation
- Internal link relevance scoring
- CTA template parsing
- Link placement algorithms

### Integration Tests
- Complete article generation flow
- Sitemap integration
- CTA injection
- Link validation

### End-to-End Tests
- Full article generation with all features
- CTA template management
- Link management

## Success Metrics
1. External link quality score
2. Internal link relevance score
3. CTA conversion tracking
4. Article generation time
5. User satisfaction metrics

## Implementation Log

### 2024-03-26
- Created implementation plan document
- Started Phase 1: External Linking implementation
- Created ExternalLinkService with:
  - Link validation
  - Authority scoring
  - Relevance ranking
  - Integration with web search API
- Created web search utility using Serper API
- Added tests for ExternalLinkService
- Updated article generation prompt to include external links
- Added external linking UI controls
- Updated types to support external linking

### Current Status
Phase 1 (External Linking) is nearly complete. Remaining tasks:
1. Fix linter errors in article-form.tsx
2. Test external linking end-to-end
3. Add error handling for external link fetching

### Next Steps
1. Begin Phase 2: Internal Linking Enhancement
2. Implement CTA template system
3. Add comprehensive testing

# Article Enhancement Implementation Plan

## Phase 1: External Linking (Current)

### Status: ✅ Complete

1. External Link Service
   - ✅ Created ExternalLinkService with link validation
   - ✅ Implemented authority scoring
   - ✅ Added relevance ranking
   - ✅ Integrated web search utility using Serper API

2. OpenAI Integration
   - ✅ Updated article generation prompt
   - ✅ Added external link integration logic
   - ✅ Enhanced content structure handling

3. UI/UX Updates
   - ✅ Added external linking toggle to article form
   - ✅ Updated ArticleSettings type
   - ✅ Fixed type-related issues in article form
   - ✅ Improved error handling and loading states

### Implementation Log

#### Latest Updates (2024-03-XX)
- Fixed all linter errors in article-form.tsx
- Updated mutation types for proper TypeScript support
- Improved error handling in article generation
- Updated loading state handling to use correct React Query properties
- Enhanced type safety throughout the form component

## Phase 2: Internal Linking Enhancement (Next)

### Planned Features
1. Sitemap Analysis
   - [ ] Implement advanced sitemap parsing
   - [ ] Add relevance scoring for internal links
   - [ ] Create link suggestion algorithm

2. Content Integration
   - [ ] Update prompt for better internal link placement
   - [ ] Add link density controls
   - [ ] Implement link relevance validation

## Phase 3: CTA Template System (Upcoming)

### Planned Features
1. Template Management
   - [ ] Create CTA template schema
   - [ ] Add template CRUD operations
   - [ ] Implement template variables

2. Integration
   - [ ] Add CTA placement logic to article generation
   - [ ] Create UI for template selection
   - [ ] Add preview functionality

## Testing Strategy

### Completed Tests
- ✅ External link validation
- ✅ Article generation with external links
- ✅ Form submission and error handling

### Pending Tests
- [ ] Internal link relevance scoring
- [ ] CTA template rendering
- [ ] End-to-end article generation flow

## Success Metrics

- External Link Quality Score: Target >80%
- Internal Link Relevance: Target >90%
- CTA Conversion Rate: Baseline + 20%

## Next Steps
1. Begin Phase 2 implementation
2. Set up monitoring for external link performance
3. Create documentation for the new features 