# User Tools Documentation

## Overview
This document provides a comprehensive guide to the user tools available in the Wordgen platform. Each tool is designed for specific content creation and SEO optimization tasks, integrated within a unified dashboard interface.

## Tool Structure
All tools are implemented as React components in the `client/src/pages` directory and are routed through the main application in `App.tsx`. They are accessible via the sidebar navigation and protected by authentication.

## Available Tools

### 1. Article Writer (`/dashboard/article-writer`)
**Component**: `ArticleWriter`
**File**: `client/src/pages/article-writer.tsx`

A single-article generation tool that creates SEO-optimized content.

**Features**:
- AI-powered content generation
- Real-time preview
- Custom generation settings
- SEO optimization suggestions
- Article editing capabilities

**Key Components**:
- `ArticleForm` - Handles input and generation settings
- `ArticlePreview` - Real-time preview of generated content

### 2. Bulk Article Writer (`/dashboard/bulk-article-writer`)
**Component**: `BulkArticleWriter`
**File**: `client/src/pages/bulk-article-writer.tsx`

Enables batch generation of multiple articles simultaneously.

**Features**:
- Multiple keyword input
- Batch processing
- Project-based organization
- Progress tracking
- Bulk export options

**Key Components**:
- `BulkArticleForm` - Handles multiple keyword inputs
- `ArticleDialog` - Detailed view of individual articles

### 3. Keyword Research (`/dashboard/keyword-research`)
**Component**: `KeywordResearch`
**File**: `client/src/pages/keyword-research.tsx`

Advanced keyword analysis and research tool.

**Features**:
- Search volume analysis
- Competition metrics
- Keyword difficulty scoring
- Related keyword suggestions
- Save to lists functionality

**Data Structure**:
```typescript
interface KeywordResearchResult {
  keyword: string;
  searchVolume: number;
  difficulty?: number;
  competition?: number;
  relatedKeywords?: string[];
}
```

### 4. My Articles (`/dashboard/my-articles`)
**Component**: `MyArticles`
**File**: `client/src/pages/my-articles.tsx`

Central hub for managing generated articles.

**Features**:
- Article organization
- Project grouping
- Search and filtering
- Edit capabilities
- Export options

**Views**:
- Individual Articles Tab
- Projects Tab with nested articles

### 5. Saved Keywords (`/dashboard/saved-lists`)
**Component**: `SavedLists`
**File**: `client/src/pages/saved-lists.tsx`

Manages collections of saved keywords and research data.

**Features**:
- List creation and management
- Keyword organization
- Metrics tracking
- Export functionality
- List sharing options

**Data Structure**:
```typescript
interface KeywordList {
  id: number;
  name: string;
  userId: number;
  savedKeywords: SavedKeyword[];
}
```

### 6. SEO Audit (`/dashboard/seo-audit`)
**Component**: `SeoAudit`
**File**: `client/src/pages/seo-audit.tsx`

Comprehensive website SEO analysis tool.

**Features**:
- Technical SEO analysis
- Content optimization check
- Mobile responsiveness testing
- Page speed insights
- Actionable recommendations

**Audit Types**:
- One-time audit
- Weekly scheduled audit
- Monthly scheduled audit

### 7. AI SEO Agent (`/dashboard/agent`)
**Component**: `Agent`
**File**: `client/src/pages/agent.tsx`

Interactive AI assistant for SEO optimization.

**Features**:
- Natural language interaction
- SEO recommendations
- Content optimization
- Technical SEO guidance
- Keyword suggestions

**Commands**:
- `/analyze [url]` - Analyze webpage SEO
- `/keywords [topic]` - Research keywords
- `/audit` - Start SEO audit
- `/optimize [text]` - Get optimization suggestions

### 8. Sitemap Analyzer (`/dashboard/sitemap-analyzer`)
**Component**: `SitemapAnalyzer`
**File**: `client/src/pages/sitemap-analyzer.tsx`

Tool for analyzing website structure and content organization.

**Features**:
- Sitemap parsing
- URL analysis
- Content structure visualization
- Historical tracking
- Export capabilities

### 9. Integrations (`/dashboard/integrations`)
**Component**: `Integrations`
**File**: `client/src/pages/integrations.tsx`

Manages external CMS and platform integrations.

**Features**:
- Webflow integration
- Content publishing
- CMS connections
- API management

## Authentication and Protection

All tools are protected by the `RequireAuth` component, which ensures:
- Only authenticated users can access tools
- Redirects to login if session expires
- Handles loading states

```typescript
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();
  
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth" replace />;
  
  return <>{children}</>;
}
```

## Routing Structure

Tools are organized under the `/dashboard` route with individual subroutes:

```typescript
<Route path="/dashboard" element={<RequireAuth><Layout /></RequireAuth>}>
  <Route index element={<Dashboard />} />
  <Route path="article-writer" element={<ArticleWriter />} />
  <Route path="bulk-article-writer" element={<BulkArticleWriter />} />
  <Route path="keyword-research" element={<KeywordResearch />} />
  <Route path="my-articles" element={<MyArticles />} />
  <Route path="saved-lists" element={<SavedLists />} />
  <Route path="seo-audit" element={<SeoAudit />} />
  <Route path="agent" element={<Agent />} />
  <Route path="sitemap-analyzer" element={<SitemapAnalyzer />} />
  <Route path="integrations" element={<Integrations />} />
</Route>
```

## State Management

Tools utilize a combination of state management approaches:
- React Query for server state
- Local state for UI interactions
- Context for global application state

## API Integration

Each tool communicates with corresponding backend endpoints:
- `/api/articles` - Article management
- `/api/keywords` - Keyword research
- `/api/seo` - SEO analysis
- `/api/ai` - AI agent interactions

## Error Handling

Tools implement consistent error handling:
- API error responses
- User feedback via toast notifications
- Graceful fallbacks
- Loading states

## UI/UX Considerations

All tools follow consistent design patterns:
- Responsive layouts
- Loading skeletons
- Error states
- Success feedback
- Progressive enhancement

## Performance Optimization

Tools are optimized for performance through:
- Code splitting
- Lazy loading
- Caching strategies
- Optimistic updates
- Debounced inputs

## Future Considerations

Areas for potential enhancement:
1. Additional CMS integrations
2. Enhanced batch processing
3. Advanced analytics
4. Team collaboration features
5. Custom workflow automation 