# Sitemap Analyzer Documentation

## Overview
The Sitemap Analyzer is a tool that allows users to fetch, analyze, and store XML sitemaps from websites. It provides historical tracking of analyzed sitemaps and a clean interface for viewing the sitemap structure.

## Features
- Domain input with automatic sitemap.xml detection
- XML sitemap fetching and parsing
- Historical report storage and viewing
- Clean, responsive UI with proper error handling

## Technical Implementation

### Components
1. Frontend (`/client/src/pages/sitemap-analyzer.tsx`)
   - React-based interface with Shadcn/UI components
   - Real-time sitemap XML display
   - Historical reports listing
   - Error handling and loading states

2. Backend (`/server/routes/scraping.ts`)
   - RESTful endpoints for sitemap operations
   - Database integration for report storage
   - Authentication middleware integration

3. Service Layer (`/server/services/scraping.service.ts`)
   - Sitemap XML fetching logic
   - Domain normalization
   - Error handling for invalid URLs

4. Database Schema (`/db/schema.ts`)
   - ScrapingTasks table for storing reports
   - Proper relations and indexes

## API Endpoints

1. `POST /api/scraping/analyze-site`
   - Accepts website URL
   - Returns sitemap XML data and task ID
   - Stores the result in database

2. `GET /api/scraping/reports`
   - Returns list of all sitemap reports for current user
   - Sorted by creation date

3. `GET /api/scraping/results/:taskId`
   - Returns specific report details
   - Includes XML data and metadata

## Outstanding Tasks

### High Priority
1. XML Parsing and Analysis
   - Add structured parsing of sitemap XML
   - Extract and categorize URLs by type/path
   - Generate insights about site structure

2. Error Recovery
   - Implement retry mechanism for failed fetches
   - Add support for robots.txt parsing
   - Handle redirects and SSL certificate issues

3. Data Processing
   - Add URL validation and cleaning
   - Implement URL grouping by path patterns
   - Add support for sitemap index files

### Future Enhancements
1. Integration Features
   - Connect with article generation workflow
   - Enable bulk URL analysis for content planning
   - Add export functionality for reports

2. Performance Optimization
   - Implement caching for frequently accessed sitemaps
   - Add pagination for large sitemaps
   - Optimize database queries for large datasets

3. Analytics
   - Add basic analytics for sitemap changes over time
   - Implement URL change detection
   - Add reporting for new/removed URLs

4. User Experience
   - Add filters for sitemap entries
   - Implement search functionality
   - Add visual sitemap structure representation

## Usage Guide

### Basic Usage
1. Navigate to the Sitemap Analyzer page
2. Enter a website domain (e.g., www.example.com)
3. Click "Analyze Sitemap" to fetch and analyze
4. View the results in the XML display area

### Viewing Historical Reports
1. Scroll to "Previous Reports" section
2. Click on any report to view its details
3. Reports show domain and timestamp information

## Security Considerations
- All requests require authentication
- Rate limiting should be implemented
- URL validation prevents malicious inputs
- SSL certificate verification is currently disabled for testing

## Dependencies
- Express.js for API routing
- React Query for data fetching
- Shadcn/UI for components
- PostgreSQL for data storage
- Drizzle ORM for database operations

## Error Handling
- Network errors are properly caught and displayed
- Invalid URLs receive appropriate error messages
- Database errors are logged and reported
- Authentication errors redirect to login

## Testing
TODO:
- Add unit tests for scraping service
- Implement integration tests for API endpoints
- Add E2E tests for frontend functionality
- Create test cases for error scenarios
