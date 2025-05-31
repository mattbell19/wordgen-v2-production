# External Linking Cost Management

## Overview
This document outlines the implementation of cost management features for external linking in the article generation system. The goal is to limit and optimize web searches to control costs while maintaining the value of external linking.

## Cost Analysis

### Search API Costs
- **Google Custom Search API**: ~$5 per 1,000 queries
- **Bing Search API**: ~$3-7 per 1,000 queries depending on tier
- **Other search APIs**: Similar pricing models

### Usage Scenarios
- **1,000 articles/month**: ~$3-5 per month
- **10,000 articles/month**: ~$30-50 per month
- **100,000 articles/month**: ~$300-500 per month

## Implemented Solutions

### 1. Search Result Caching
- Implemented a caching system with a 7-day TTL
- Normalized keywords for better cache hit rates
- Added a `forceRefresh` parameter for manual cache invalidation

### 2. User Quota System
- Created a `SearchUsageService` to track search usage per user
- Implemented monthly usage limits based on user tier
- Added automatic quota reset at the beginning of each month

### 3. UI Integration
- Added search usage information to the article settings dialog
- Created a dedicated search usage dashboard
- Implemented automatic disabling of external linking when quota is reached

### 4. API Endpoints
- Added an endpoint to retrieve current search usage
- Integrated quota checking into the article generation process

## User Experience

### For Users
- Clear visibility of search usage in the article settings
- Automatic disabling of external linking when quota is reached
- Dedicated dashboard to monitor usage

### For Administrators
- Configurable search limits per user tier
- Usage tracking for billing and analytics
- Optimized cost management through caching

## Technical Implementation

### Caching Strategy
- In-memory cache with keyword normalization
- 7-day TTL to balance freshness and cost
- Cache hits don't count against user quota

### Quota Management
- Monthly reset based on calendar month
- Configurable limits per user tier
- Graceful degradation when quota is reached

## Future Enhancements

### Potential Improvements
1. **Persistent Caching**: Move from in-memory to database storage for cache
2. **Advanced Analytics**: Track most common searches and optimize caching
3. **Smart Quota Management**: Adjust limits based on usage patterns
4. **Bulk Discounts**: Implement tiered pricing for high-volume users

## Conclusion
The implemented cost management system provides a balance between functionality and cost control. By caching search results and implementing user quotas, we can offer valuable external linking while keeping API costs predictable and manageable.
