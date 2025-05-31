# Google Search Console Integration Plan

## Overview

This document outlines the implementation plan for integrating Google Search Console (GSC) into WordGen v2. The integration will provide users with valuable SEO insights directly within the application, allowing them to track website performance, identify keyword opportunities, and optimize content strategy based on real search data.

## Implementation Phases

### Phase 1: Basic Integration (MVP)
- [x] Set up Google API project and configure OAuth credentials
- [x] Create database schema for GSC connections and site data
- [x] Implement Google OAuth flow
- [x] Create backend API endpoints for basic GSC data
- [x] Develop UI for connecting GSC account and selecting sites
- [x] Display basic search performance metrics on dashboard

### Phase 2: Advanced Analytics
- [  ] Implement keyword analysis features
- [  ] Add page performance tracking
- [  ] Create detailed performance dashboards
- [  ] Integrate GSC data into the article generation workflow

### Phase 3: Recommendations Engine
- [  ] Develop content optimization recommendations
- [  ] Implement keyword tracking for generated articles
- [  ] Create performance comparison reports
- [  ] Add automated insights and suggestions

## Technical Implementation Details

### Database Schema

```sql
-- GSC connections table
CREATE TABLE gsc_connections (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_token VARCHAR NOT NULL,
  refresh_token VARCHAR NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GSC sites table
CREATE TABLE gsc_sites (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_url VARCHAR NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- GSC keyword tracking table
CREATE TABLE gsc_keyword_tracking (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  site_id INTEGER NOT NULL REFERENCES gsc_sites(id) ON DELETE CASCADE,
  keyword VARCHAR NOT NULL,
  article_id INTEGER REFERENCES articles(id) ON DELETE SET NULL,
  is_tracking BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

### API Endpoints

- `GET /api/gsc/auth`: Initiate Google OAuth flow
- `GET /api/gsc/callback`: Handle OAuth callback and token storage
- `GET /api/gsc/sites`: Retrieve list of sites registered in user's GSC account
- `POST /api/gsc/sites`: Set default site for a user
- `GET /api/gsc/performance`: Get search performance data for a specific site
- `GET /api/gsc/keywords`: Get top performing keywords for a site
- `GET /api/gsc/pages`: Get top performing pages for a site
- `GET /api/gsc/recommendations`: Generate content recommendations based on GSC data

### Frontend Components

- GSC Connection Setup Wizard
- Site Selector for users with multiple sites
- Search Performance Dashboard
- Keyword Performance Table
- Page Performance Table
- Content Recommendations Panel

## Progress Tracking

| Task | Status | Date | Notes |
|------|--------|------|-------|
| Create integration plan document | Completed | 2025-04-06 | Initial plan created |
| Set up Google API project configuration | Completed | 2025-04-06 | Created config file with OAuth settings |
| Create database schema for GSC | Completed | 2025-04-06 | Created schema and migration files |
| Implement GSC service | Completed | 2025-04-06 | Created service for interacting with GSC API |
| Create API routes for GSC | Completed | 2025-04-06 | Implemented routes for auth, sites, and data |
| Create client-side hooks | Completed | 2025-04-06 | Created React hooks for GSC integration |
| Develop UI components | Completed | 2025-04-06 | Created connection, site selector, and data display components |
| Create Search Console dashboard | Completed | 2025-04-06 | Implemented dashboard page with tabs |
| Add navigation link | Completed | 2025-04-06 | Added Search Console to sidebar navigation |
| Configure Google API project | Completed | 2025-04-07 | Added OAuth credentials to environment variables |
| Create database tables | Completed | 2025-04-07 | Created tables for GSC connections and data |
| Create unit tests | Completed | 2025-04-07 | Created tests for GSC service, routes, and components |

## Next Steps

1. ✅ Configure Google API project in Google Cloud Console
2. ✅ Run database migrations to create GSC tables
3. Implement advanced keyword analysis features
4. Add keyword tracking for generated articles
5. Create content recommendations based on GSC data
