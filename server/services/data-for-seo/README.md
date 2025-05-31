# SEO Audit System

This module provides comprehensive SEO auditing functionality using the DataForSEO API. It enables website analysis, issue detection, and report generation for improving SEO performance.

## Features

- Comprehensive website crawling and analysis
- Detailed reports with actionable insights
- Issue detection and prioritization
- Performance metrics and recommendations
- Caching for improved performance
- Error handling with graceful fallbacks
- Task management for background processing

## Architecture

The SEO Audit System consists of the following components:

### DataForSEO Client (`client.ts`)

A typed API client for interacting with the DataForSEO API. It handles:

- Authentication with DataForSEO API
- Request formatting and response parsing
- Error handling with automatic retries
- Response caching for improved performance

### SEO Audit Service (`seo-audit.service.ts`)

Provides the core functionality for SEO audits:

- Creating audit tasks
- Monitoring task status
- Retrieving audit data
- Processing raw API responses

### Report Generator (`report-generator.service.ts`)

Generates comprehensive SEO reports from audit data:

- Extracts and organizes SEO issues
- Calculates performance metrics
- Analyzes content quality
- Prioritizes recommendations

### Task Manager (`task-manager.service.ts`)

Manages background SEO audit tasks:

- Tracks task status and progress
- Handles long-running operations
- Provides task cleanup and maintenance
- Associates tasks with users

### Cache Manager (`cache-manager.ts`)

Provides caching functionality for API responses:

- In-memory LRU cache with configurable max size
- TTL (Time-To-Live) for cached items
- Eviction of least recently used items
- Cache statistics tracking and logging

### Error Handler (`error-handler.ts`)

Provides robust error handling and data safety:

- Custom error classes for different scenarios
- Default fallback values
- Safe data access utilities
- Retry mechanism with exponential backoff

## Type Definitions

The system includes comprehensive type definitions:

- `types/report.ts`: Defines the structure of SEO audit reports
- `types/api-responses.ts`: Maps DataForSEO API responses to TypeScript interfaces

## Usage

### Creating an SEO Audit Task

```typescript
import { SeoAuditService } from './services/data-for-seo/seo-audit.service';

const seoAuditService = new SeoAuditService();

// Create a new audit task
const task = await seoAuditService.createAuditTask(
  'https://example.com',
  1, // userId
  {
    max_crawl_pages: 100,
    load_resources: true,
    enable_javascript: true
  }
);

console.log(`Created task: ${task.id}`);
```

### Checking Audit Progress

```typescript
// Check the status of an audit
const status = await seoAuditService.getAuditStatus(task.taskId);

console.log(`Progress: ${status.progress}%`);
console.log(`Status: ${status.status}`);

if (status.summary) {
  console.log(`OnPage Score: ${status.summary.onPageScore}`);
  console.log(`Pages Crawled: ${status.summary.pagesCrawled}`);
}
```

### Generating a Report

```typescript
import { ReportGeneratorService } from './services/data-for-seo/report-generator.service';

const reportGenerator = new ReportGeneratorService();

// Generate a report for a completed task
const report = await reportGenerator.generateReport(task.id);

if (report) {
  console.log(`Report generated: ${report.id}`);
  console.log(`OnPage Score: ${report.summary.onPageScore}`);
  console.log(`Critical Issues: ${report.summary.issuesBySeverity.critical}`);
  console.log(`High Issues: ${report.summary.issuesBySeverity.high}`);
}
```

## Testing

The system includes comprehensive unit tests:

- `__tests__/client.test.ts`: Tests for the DataForSEO API client
- `__tests__/report-generator.test.ts`: Tests for the report generator
- `__tests__/cache-manager.test.ts`: Tests for the cache manager

Run the tests using Jest:

```bash
npm test
```

## Configuration

The SEO Audit System can be configured through environment variables:

- `DATA_FOR_SEO_USERNAME`: DataForSEO API username
- `DATA_FOR_SEO_PASSWORD`: DataForSEO API password

## Error Handling

The system includes robust error handling:

```typescript
import { safeGet, logError, withRetry } from './services/data-for-seo/error-handler';

// Safe data access with fallback
const value = safeGet(() => response.data.complex.nested.property, 'default');

// Retry with exponential backoff
const result = await withRetry(async () => {
  return await api.fetchData();
}, 3, 1000);

// Error logging
try {
  await api.performOperation();
} catch (error) {
  logError(error, { context: 'performOperation', additionalData: 'value' });
}
```

## Caching

The system includes a caching layer for API responses:

```typescript
import { dataForSEOCache } from './services/data-for-seo/cache-manager';

// Manually cache a value
dataForSEOCache.set('key', value, 3600000); // TTL: 1 hour

// Retrieve a cached value
const cachedValue = dataForSEOCache.get('key');

// Check cache stats
const stats = dataForSEOCache.getStats();
console.log(`Cache hit ratio: ${stats.hits / (stats.hits + stats.misses) * 100}%`);
``` 