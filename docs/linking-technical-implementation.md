# Internal and External Linking: Technical Implementation

## Architecture Overview

The linking system consists of several interconnected components that work together to provide internal and external linking functionality in generated articles.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Article Form   │────▶│  GPT Client     │────▶│  Generated      │
│  (UI Controls)  │     │  (Processing)   │     │  Article        │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                        │
        ▼                       ▼                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Article        │     │  Link Services  │     │  Link           │
│  Settings       │     │  (Backend)      │     │  Formatting     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │  Usage Tracking │
                        │  & Caching      │
                        └─────────────────┘
```

## Core Components

### 1. Internal Linking System

#### InternalLinkService (`server/services/internal-link.service.ts`)
- **Purpose**: Manages internal links from user's sitemap
- **Key Methods**:
  - `parseSitemap(sitemapXml)`: Extracts URLs from sitemap XML
  - `analyzePageContent(url)`: Determines page topics from HTML content
  - `storeUserLinks(userId, sitemapUrl)`: Processes and stores sitemap links
  - `findRelevantLinks(userId, keyword, maxLinks)`: Finds relevant links for a keyword

#### Sitemap API Routes (`server/routes/sitemap.ts`)
- **Endpoints**:
  - `POST /api/sitemap/add`: Adds a sitemap URL for a user
  - `GET /api/sitemap/links`: Retrieves stored internal links

#### Sitemap Manager UI (`client/src/components/sitemap-manager.tsx`)
- **Features**:
  - Form for submitting sitemap URLs
  - Display of available internal links
  - Error handling and validation

### 2. External Linking System

#### ExternalLinkService (`server/services/external-link.service.ts`)
- **Purpose**: Finds relevant external links for article topics
- **Key Methods**:
  - `findLinkingOpportunities(keyword)`: Searches for relevant external links
  - `validateLinks(links)`: Filters out social media and non-HTTPS links
  - `rankLinks(links)`: Ranks links by authority and relevance

#### SearchUsageService (`server/services/search-usage.service.ts`)
- **Purpose**: Tracks and limits search API usage
- **Key Methods**:
  - `getUserSearchUsage(userId)`: Gets a user's current usage
  - `hasSearchQuotaRemaining(userId)`: Checks if user has remaining quota
  - `incrementSearchUsage(userId)`: Increments usage counter

#### Search Usage API Routes (`server/routes/search-usage.ts`)
- **Endpoints**:
  - `GET /api/search-usage`: Retrieves current search usage statistics

#### Search Usage Dashboard (`client/src/components/search-usage-dashboard.tsx`)
- **Features**:
  - Display of current usage and limits
  - Progress bar for visual representation
  - Information about quota reset

### 3. Integration with Article Generation

#### GPT Client (`server/lib/gpt-client.ts`)
- **Purpose**: Generates articles with embedded links
- **Key Methods**:
  - `generateArticle(params)`: Main article generation function
  - Fetches internal and external links
  - Includes linking instructions in the prompt

#### Article Settings Dialog (`client/src/components/article-settings-dialog.tsx`)
- **Features**:
  - Toggles for enabling/disabling internal and external linking
  - Display of sitemap and search usage status
  - Links to sitemap and search usage management pages

## Data Flow

### Internal Linking Flow
1. User adds sitemap URL via Sitemap Manager
2. System parses sitemap and extracts URLs
3. System analyzes each page to determine topics
4. When generating an article, system finds relevant links based on keyword
5. GPT client includes internal linking instructions in the prompt
6. Generated article includes internal links with proper formatting

### External Linking Flow
1. User enables external linking in article settings
2. System checks if user has search quota remaining
3. If quota available, system performs web search (or uses cache)
4. System filters and ranks external links
5. GPT client includes external linking instructions in the prompt
6. Generated article includes external links with proper formatting

## Dependency Logic

### Internal Linking Dependencies
- Internal linking requires a sitemap to be added
- The toggle is disabled if no sitemap is available
- A warning message appears when sitemap is missing
- Internal linking is automatically disabled if sitemap is removed

### External Linking Dependencies
- External linking requires search quota to be available
- The toggle is disabled if quota is depleted
- Search usage information is displayed in settings
- External linking is automatically disabled when quota is reached

## Caching Mechanisms

### External Link Caching
- Search results are cached for 7 days
- Cache key is the normalized keyword
- Cache hits don't count against search quota
- Cache includes timestamp for TTL calculation

## Error Handling

### Sitemap Processing
- Invalid sitemap URLs are rejected with appropriate error messages
- Sitemap parsing errors are caught and reported
- Page analysis failures don't block the entire process

### Search API
- Search API failures are gracefully handled
- System falls back to empty results if search fails
- Error messages are logged for debugging

## Performance Considerations

### Sitemap Processing
- Limited to 20 URLs per sitemap for initial implementation
- Asynchronous processing to avoid blocking
- Results stored in memory for quick access

### Search API Usage
- Caching to reduce API calls
- Quota system to prevent excessive usage
- Normalized keywords to improve cache hit rate

## Security Considerations

### User Data Isolation
- Each user's links are stored separately
- Users can only access their own sitemap and search usage data
- Authentication required for all API endpoints

### External Content
- External links are validated before inclusion
- Social media and potentially harmful domains are excluded
- Only HTTPS links are allowed

## Future Enhancements

### Internal Linking
- Support for multiple sitemaps per user
- Manual addition and editing of internal links
- More sophisticated topic extraction using NLP
- Persistent storage for sitemap data

### External Linking
- Advanced relevance scoring using semantic analysis
- Domain reputation scoring for better link quality
- User-defined excluded domains
- Persistent storage for search cache
