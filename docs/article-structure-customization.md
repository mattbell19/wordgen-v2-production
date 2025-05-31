# Article Structure Customization

## Overview

This document outlines the implementation plan for adding customization options for article structure in the Article Writer feature. This enhancement will allow users to tailor the structure of generated articles to better suit their specific needs and content strategies.

## Customization Options

The following customization options will be provided to users:

### 1. Section Selection

Users will be able to select which sections to include in their articles:

- **Introduction** (always included)
- **What is [Topic]** - Definition and explanation
- **Why [Topic] Matters** - Benefits and importance
- **How to Use [Topic]** - Implementation steps
- **Best Practices** - Tips and recommendations
- **Common Challenges** - Problems and solutions
- **Case Studies/Examples** - Real-world applications
- **Comparison** - Comparing with alternatives
- **Future Trends** - Upcoming developments
- **Conclusion** (always included)

### 2. Visual Elements

Users will be able to customize which visual elements to include:

- **Quick Takeaways** - Key points highlighted in teal boxes
- **Pro Tips** - Expert advice highlighted in amber boxes
- **Stat Highlights** - Important statistics highlighted in purple boxes
- **Comparison Tables** - Structured tables for comparing options
- **Callout Boxes** - Important notes or warnings
- **Image Suggestions** - Recommendations for images

### 3. SEO Features

Users will be able to toggle SEO features:

- **Table of Contents** - Structured navigation
- **FAQ Section** - Frequently asked questions with schema markup
- **Related Topics** - LSI keywords and related concepts
- **Meta Description Suggestion** - SEO-optimized description

### 4. Content Tone and Style

Users will be able to customize:

- **Tone** - Professional, casual, friendly, authoritative, etc.
- **Reading Level** - Basic, intermediate, advanced
- **Content Density** - Concise vs. comprehensive
- **Target Audience** - Beginners, experts, general audience

## Implementation Plan

### 1. UI Components

#### Article Settings Dialog Enhancement

Enhance the existing article settings dialog to include:

- A "Structure" tab with section selection options
- A "Visual Elements" tab with toggles for each element type
- An "SEO Features" tab with toggles for each feature
- An expanded "Style" tab with tone and audience options

#### Preview Component

Add a preview component that shows a simplified outline of the article structure based on selected options.

### 2. Backend Changes

#### Enhanced Prompt Generation

Modify the prompt generation logic to incorporate the user's structure preferences:

- Include selected sections in the prompt instructions
- Specify which visual elements to include
- Adjust tone and style parameters

#### Article Service Updates

Update the article service to:

- Accept and process structure preferences
- Pass customization options to the AI service
- Store user preferences for future use

### 3. User Preferences Storage

Create a system to:

- Save user preferences for article structure
- Allow users to create and save multiple structure templates
- Provide default templates for common content types (how-to, listicle, product review, etc.)

## Technical Implementation Details

### Database Schema Updates

Add the following to the user preferences schema:

```typescript
interface ArticleStructurePreference {
  id: string;
  userId: string;
  name: string;
  sections: {
    whatIs: boolean;
    whyMatters: boolean;
    howTo: boolean;
    bestPractices: boolean;
    challenges: boolean;
    caseStudies: boolean;
    comparison: boolean;
    futureTrends: boolean;
  };
  visualElements: {
    quickTakeaways: boolean;
    proTips: boolean;
    statHighlights: boolean;
    comparisonTables: boolean;
    calloutBoxes: boolean;
    imageSuggestions: boolean;
  };
  seoFeatures: {
    tableOfContents: boolean;
    faqSection: boolean;
    relatedTopics: boolean;
    metaDescription: boolean;
  };
  contentStyle: {
    tone: string;
    readingLevel: string;
    contentDensity: string;
    targetAudience: string;
  };
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### API Endpoints

Add the following API endpoints:

- `GET /api/article-structure/preferences` - Get user's saved structure preferences
- `POST /api/article-structure/preferences` - Create a new structure preference
- `PUT /api/article-structure/preferences/:id` - Update a structure preference
- `DELETE /api/article-structure/preferences/:id` - Delete a structure preference
- `POST /api/article-structure/preferences/:id/set-default` - Set a preference as default

### UI Components

Create the following React components:

- `ArticleStructureTab` - Section selection UI
- `VisualElementsTab` - Visual elements toggles
- `SeoFeaturesTab` - SEO features toggles
- `ContentStyleTab` - Tone and style options
- `StructurePreview` - Visual preview of selected structure
- `SavedTemplatesDropdown` - Dropdown to select saved templates

## User Flow

1. User navigates to the Article Writer
2. User clicks "Settings" and goes to the "Structure" tab
3. User selects desired sections, visual elements, and SEO features
4. User sees a preview of the article structure
5. User can save the structure as a template for future use
6. User generates an article with the customized structure

## Testing Plan

Test the following scenarios:

1. Creating articles with different section combinations
2. Toggling various visual elements on/off
3. Changing tone and style parameters
4. Saving and loading structure templates
5. Setting default templates
6. Generating articles with saved templates

## Timeline

- Week 1: UI design and component development
- Week 2: Backend API implementation
- Week 3: Integration and testing
- Week 4: Refinement and documentation

## Testing Instructions

To test the Article Structure Customization feature, follow these steps:

### Manual Testing

Refer to the comprehensive testing guide in `docs/article-structure-testing.md` for detailed test cases and procedures.

### Browser Console Testing

A browser console test utility is available in `client/src/utils/structure-settings-test.js`. To use it:

1. Open the Article Writer page in your browser
2. Open the browser console (F12 or right-click > Inspect > Console)
3. Copy and paste the contents of the test utility file
4. Run `window.testArticleStructureSettings()`
5. Follow the console output to verify that all components are working correctly

### Integration Testing

To test the integration with the backend:

1. Generate articles with different structure settings
2. Verify that the generated articles match the selected structure settings
3. Check that all selected sections, visual elements, and SEO features are included
4. Verify that the content style matches the selected options

## Success Metrics

- Increased user satisfaction with generated articles
- Reduced need for manual editing after generation
- Increased usage of the Article Writer feature
- Positive user feedback on customization options

## Quality Assurance and Security Audit

A comprehensive audit of the Article Structure Customization feature identified several areas for improvement to ensure robustness, security, and optimal user experience.

### 1. Usage Abuse Prevention

- **Template Storage Limits**: Implement a maximum of 20 templates per user to prevent database bloat
- **Template Size Limits**: Validate template size before saving (max 100KB per template)
- **Rate Limiting**: Add rate limiting for template operations (max 50 operations per hour)

### 2. Database/Schema Improvements

- **Template Schema**: Implement proper database schema for server-side template storage
- **Validation**: Add comprehensive validation for template structure during import/export
- **Indexing**: Ensure proper database indexing for efficient template queries

```typescript
// Template database schema
interface TemplateSchema {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  isPublic: boolean;
  sections: Record<string, boolean>;
  visualElements: Record<string, boolean>;
  seoFeatures: Record<string, boolean>;
  contentStyle: {
    tone: string;
    readingLevel: string;
    contentDensity: number;
    targetAudience: string;
  };
}
```

### 3. Error Handling Improvements

- **User Feedback**: Implement clear error messages for all operations
- **API Error Handling**: Add proper error handling for all API calls
- **Validation Errors**: Provide specific feedback for validation failures
- **Recovery Options**: Add options to recover from failed operations

### 4. Performance Optimizations

- **Memoization**: Use React.memo and useMemo to prevent unnecessary re-renders
- **Pagination**: Implement pagination for template lists with many items
- **Lazy Loading**: Use lazy loading for template management dialog
- **Debouncing**: Add debouncing for input fields to reduce unnecessary updates

### 5. Security Enhancements

- **Input Sanitization**: Sanitize all user inputs to prevent XSS attacks
- **Authentication**: Add proper authentication checks for template operations
- **CSRF Protection**: Implement CSRF tokens for all API requests
- **Content Security Policy**: Add appropriate CSP headers

### 6. Accessibility Improvements

- **ARIA Attributes**: Add proper ARIA attributes to all components
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Screen Reader Support**: Add appropriate labels and descriptions for screen readers
- **Color Contrast**: Ensure sufficient color contrast for all UI elements

### 7. Testing Strategy

Implement comprehensive testing to verify functionality and catch issues:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test interactions between components
- **End-to-End Tests**: Test complete user workflows
- **Accessibility Tests**: Verify accessibility compliance
- **Performance Tests**: Measure and optimize performance

### 8. Future Enhancements

- **Template Versioning**: Track changes and allow reverting to previous versions
- **Template Categories**: Help users organize templates by category
- **Template Analytics**: Track which templates are used most frequently
- **Collaborative Editing**: Allow multiple users to edit templates simultaneously
- **Template Marketplace**: Enable users to share templates with the community

### 1. Usage Abuse Prevention

- **Template Storage Limits**: Implement a maximum of 20 templates per user to prevent database bloat
- **Template Size Limits**: Validate template size before saving (max 100KB per template)
- **Rate Limiting**: Add rate limiting for template operations (max 50 operations per hour)

### 2. Database/Schema Improvements

- **Template Schema**: Implement proper database schema for server-side template storage
- **Validation**: Add comprehensive validation for template structure during import/export
- **Indexing**: Ensure proper database indexing for efficient template queries

```typescript
// Template database schema
interface TemplateSchema {
  id: string;
  userId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isDefault: boolean;
  isPublic: boolean;
  sections: Record<string, boolean>;
  visualElements: Record<string, boolean>;
  seoFeatures: Record<string, boolean>;
  contentStyle: {
    tone: string;
    readingLevel: string;
    contentDensity: number;
    targetAudience: string;
  };
}
```

### 3. Error Handling Improvements

- **User Feedback**: Implement clear error messages for all operations
- **API Error Handling**: Add proper error handling for all API calls
- **Validation Errors**: Provide specific feedback for validation failures
- **Recovery Options**: Add options to recover from failed operations

### 4. Performance Optimizations

- **Memoization**: Use React.memo and useMemo to prevent unnecessary re-renders
- **Pagination**: Implement pagination for template lists with many items
- **Lazy Loading**: Use lazy loading for template management dialog
- **Debouncing**: Add debouncing for input fields to reduce unnecessary updates

### 5. Security Enhancements

- **Input Sanitization**: Sanitize all user inputs to prevent XSS attacks
- **Authentication**: Add proper authentication checks for template operations
- **CSRF Protection**: Implement CSRF tokens for all API requests
- **Content Security Policy**: Add appropriate CSP headers

### 6. Accessibility Improvements

- **ARIA Attributes**: Add proper ARIA attributes to all components
- **Keyboard Navigation**: Ensure all interactive elements are keyboard accessible
- **Screen Reader Support**: Add appropriate labels and descriptions for screen readers
- **Color Contrast**: Ensure sufficient color contrast for all UI elements

### 7. Testing Strategy

Implement comprehensive testing to verify functionality and catch issues:

- **Unit Tests**: Test individual components and functions
- **Integration Tests**: Test interactions between components
- **End-to-End Tests**: Test complete user workflows
- **Accessibility Tests**: Verify accessibility compliance
- **Performance Tests**: Measure and optimize performance

### 8. Future Enhancements

- **Template Versioning**: Track changes and allow reverting to previous versions
- **Template Categories**: Help users organize templates by category
- **Template Analytics**: Track which templates are used most frequently
- **Collaborative Editing**: Allow multiple users to edit templates simultaneously
- **Template Marketplace**: Enable users to share templates with the community
