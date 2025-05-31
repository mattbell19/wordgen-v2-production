# Internal and External Linking Implementation Plan

## Overview
This document outlines the plan to implement functional internal and external linking for article generation in the WordGen application.

## Current Status
- UI controls for enabling/disabling internal and external linking exist
- External linking service is partially implemented
- Internal linking service is missing
- No integration with article generation process

## Implementation Plan

### Phase 1: Basic Implementation
- [ ] Implement the `InternalLinkService` class
- [ ] Update the GPT client to include linking instructions in prompts
- [ ] Add sitemap management API endpoints

### Phase 2: UI Integration
- [ ] Create the sitemap management UI component
- [ ] Add a sitemap management page
- [ ] Link to the sitemap management page from the article settings dialog

### Phase 3: Testing and Refinement
- [ ] Test the internal and external linking functionality
- [ ] Refine the link relevance scoring algorithm
- [ ] Add caching for sitemap data to improve performance

## Technical Details

### InternalLinkService
The service will:
- Parse sitemap XML to extract URLs
- Analyze page content to determine topics
- Store internal links for each user
- Find relevant links based on article keywords

### GPT Client Integration
The GPT client will:
- Fetch relevant internal and external links
- Include linking instructions in the prompt
- Format links properly in the generated content

### Sitemap Management
The application will:
- Allow users to add their sitemap URL
- Process and store the sitemap data
- Display available internal links
- Automatically use these links in article generation

## Implementation Log

### Phase 1: Basic Implementation (Completed)

1. **Created InternalLinkService**
   - Implemented `server/services/internal-link.service.ts`
   - Added methods for parsing sitemaps, analyzing page content, and finding relevant links
   - Created a singleton instance for application-wide use

2. **Updated GPT Client**
   - Modified `server/lib/gpt-client.ts` to fetch internal and external links
   - Added linking instructions to the prompt
   - Ensured proper formatting of links in generated content

3. **Added Sitemap API Endpoints**
   - Created `server/routes/sitemap.ts` with endpoints for adding sitemaps and retrieving links
   - Registered the routes in the main server file

### Phase 2: UI Integration (Completed)

1. **Created Sitemap Management UI**
   - Implemented `client/src/components/sitemap-manager.tsx` component
   - Added form for submitting sitemap URLs
   - Added table for displaying available internal links

2. **Added Sitemap Management Page**
   - Created `client/src/pages/settings/sitemap.tsx`
   - Added PageHeader component for consistent UI

### Phase 3: Integration and Refinement (Completed)

1. **Integration with Article Settings**
   - Added a link to the sitemap management page from the article settings dialog
   - Improved the internal linking UI with better descriptions

2. **Added Sitemap Dependency Logic**
   - Modified the GPT client to check if the user has a sitemap before attempting internal linking
   - Created a `useSitemap` hook to check for sitemap availability
   - Updated the article settings dialog to disable internal linking when no sitemap is available
   - Added helpful messages to guide users to add a sitemap

### Phase 4: External Linking Cost Management (Completed)

1. **Search Result Caching**
   - Added caching system to `ExternalLinkService` with 7-day TTL
   - Implemented keyword normalization for better cache hit rates
   - Added support for forced cache refresh when needed

2. **User Quota System**
   - Created `SearchUsageService` to track search usage per user
   - Implemented tiered monthly limits (free: 10, basic: 50, premium: 200)
   - Added automatic quota reset at the beginning of each month

3. **UI Integration**
   - Added search usage information to the article settings dialog
   - Created a dedicated search usage dashboard
   - Implemented automatic disabling of external linking when quota is reached
   - Added links to the search usage dashboard from article settings

4. **API Endpoints**
   - Added endpoint to retrieve current search usage
   - Integrated quota checking into the article generation process

### Next Steps

1. **Testing and Refinement**
   - Test the internal and external linking functionality with real sitemaps
   - Refine the link relevance scoring algorithm based on user feedback
   - Add caching for sitemap data to improve performance

2. **Future Enhancements**
   - Add ability to manually add internal links
   - Implement link analytics to track which internal links are most effective
   - Add support for multiple sitemaps per user
   - Implement persistent storage for search cache
