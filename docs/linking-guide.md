# Internal and External Linking Guide

## Overview

This document provides a comprehensive guide to the internal and external linking functionality in the WordGen application. Linking is a crucial aspect of content creation that improves SEO, enhances user experience, and increases the credibility of your content.

## Types of Links

### Internal Links

Internal links connect pages within your own website. They help:
- Improve site navigation
- Establish information hierarchy
- Distribute page authority throughout your site
- Keep users on your site longer

### External Links

External links connect to pages on other websites. They help:
- Provide additional resources and references
- Increase content credibility
- Improve SEO through association with authoritative sources
- Create networking opportunities with other websites

## How Linking Works in WordGen

### Internal Linking

#### Prerequisites
- You must add your website's sitemap before internal linking can be enabled
- The sitemap is used to extract URLs and analyze page topics
- Internal linking is automatically disabled if no sitemap is available

#### Process
1. When you enable internal linking for an article, the system:
   - Analyzes your sitemap to find relevant pages
   - Matches page topics to your article's keyword
   - Ranks potential links by relevance
   - Includes the most relevant links in your article

#### Configuration
- Access the sitemap manager at `/settings/sitemap`
- Add your sitemap URL (typically `https://yourdomain.com/sitemap.xml`)
- Enable internal linking in the article settings

### External Linking

#### How It Works
- When you enable external linking, the system:
  - Performs a web search based on your article's keyword
  - Filters out social media and non-HTTPS links
  - Ranks results based on authority and relevance
  - Includes the top-ranked links in your article

#### Cost Management
- Each article with external linking uses one search API call
- Search results are cached for 7 days to reduce costs
- You have a monthly quota of searches based on your subscription tier
- When you reach your quota, external linking is automatically disabled

#### Configuration
- Enable external linking in the article settings
- Monitor your search usage at `/settings/search-usage`
- Search usage resets monthly

## Best Practices

### Internal Linking
1. **Complete Your Sitemap**: Ensure your sitemap includes all important pages
2. **Use Descriptive Titles**: Page titles help the system understand your content
3. **Create Content Clusters**: Develop related content to increase linking opportunities
4. **Review Generated Links**: Check that internal links are relevant to your content

### External Linking
1. **Use Selectively**: Enable for important articles that benefit from external references
2. **Monitor Usage**: Keep track of your search quota, especially near month-end
3. **Verify Links**: Review external links to ensure they're appropriate for your content
4. **Supplement Manually**: Add additional external links manually if needed

## Technical Implementation

### Internal Linking
- `InternalLinkService`: Parses sitemaps and analyzes page content
- `SitemapManager`: UI component for managing sitemaps
- Relevance scoring based on keyword matching between article topic and page topics

### External Linking
- `ExternalLinkService`: Finds and ranks external links
- `SearchUsageService`: Tracks and limits search API usage
- Caching system to reduce redundant searches

## Troubleshooting

### Internal Linking Issues
- **Links Not Appearing**: Ensure your sitemap is valid and contains relevant pages
- **Irrelevant Links**: Improve page titles and content to better reflect topics
- **Too Few Links**: Add more content to your sitemap or adjust your article keyword

### External Linking Issues
- **Links Not Appearing**: Check your search quota in the settings
- **Irrelevant Links**: Try using more specific keywords in your article
- **Quota Depleted**: Wait for monthly reset or upgrade your subscription tier

## FAQ

### Internal Linking
1. **How many internal links will be added?**
   - The system adds up to 3 relevant internal links per article

2. **Can I manually specify internal links?**
   - Currently, links are selected automatically based on relevance

3. **What if my site doesn't have a sitemap?**
   - You'll need to create a sitemap for your site to use internal linking

### External Linking
1. **How many external links will be added?**
   - The system adds up to 3 high-quality external links per article

2. **What determines link quality?**
   - Links are ranked based on domain authority and content relevance

3. **Will this affect my search quota if I regenerate an article?**
   - Only if the cache has expired (after 7 days) or you use a different keyword
