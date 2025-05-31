# Bulk Article Generator Documentation

## Overview
The bulk article generator enables users to create multiple SEO-optimized articles simultaneously using AI technology. This feature is integrated with the project management system and sitemap analyzer for intelligent internal linking.

## Features

### Project-Based Organization
- Articles are organized into projects for better management
- Each project tracks:
  - Total keywords to be processed
  - Number of completed articles
  - Project status and progress
  - Project settings and metadata

### Bulk Article Generation
- Generate multiple articles in a single request
- Support for various content settings:

### Internal Linking Integration
- Automatic link suggestions from sitemap data
- Smart link placement based on content relevance
- Support for markdown-style link formatting
- Proper HTML rendering in preview
- Link relevance scoring and filtering

### Article Generation Settings
- Internal linking toggle for each article
- Word count customization
- Writing style selection (professional, casual, friendly)
- Language selection
- Sitemap-based link suggestions

### Progress Tracking
- Real-time progress tracking of article generation
- Articles are accessible through the My Articles dashboard
- Project status updates as articles are completed

## Technical Implementation

### Database Schema
The system uses the following tables:
```typescript
// Projects table
projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").default("pending").notNull(),
  totalKeywords: integer("total_keywords").default(0).notNull(),
  completedKeywords: integer("completed_keywords").default(0).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Articles table with project relation
articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  content: text("content").notNull(),
  wordCount: integer("word_count").notNull(),
  readingTime: integer("reading_time").notNull(),
  settings: json("settings").$type<ArticleSettings>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
```

### API Endpoints

#### Bulk Generation
```typescript
POST /api/bulk/generate
Body: {
  projectName: string;
  projectDescription?: string;
  keywords: string[];
  settings: ArticleSettings;
}
```

#### Project Management
```typescript
GET /api/projects
Response: Project[]

GET /api/articles?projectId={id}
Response: Article[]
```

### Frontend Components

#### BulkArticleForm
- Handles project creation and article generation settings
- Manages keyword input and validation
- Initiates bulk generation process

#### ArticleDialog
- Displays full article content
- Provides editing capabilities
- Supports article download in multiple formats

#### My Articles Dashboard
- Project-based organization
- Progress tracking
- Article preview and management

#### ArticlePreview
- Renders markdown-style links as HTML
- Proper link styling and hover effects
- External links open in new tabs
- Preserves article formatting
- Supports internal link highlighting

#### Internal Linking System
```typescript
// Internal link interface
interface InternalLink {
  url: string;
  topic: string;
}

// Article settings with internal linking
interface ArticleSettings {
  keyword: string;
  tone: string;
  wordCount: number;
  enableInternalLinking?: boolean;
  internalLinks?: InternalLink[];
}
```

## User Experience

### Project Creation
1. User enters project name and description
2. Provides list of keywords for article generation
3. Configures article generation settings
4. Initiates bulk generation process

### Article Management
1. Articles are automatically organized under projects
2. Access through My Articles dashboard
3. View and edit individual articles
4. Download articles in various formats

### Progress Tracking
- Real-time status updates
- Project completion percentage
- Individual article status

## Best Practices

### Performance
- Batch processing for article generation
- Efficient database queries using proper relations
- Frontend caching using React Query

### Error Handling
- Proper validation of input data
- Error recovery mechanisms
- Clear error messages to users

### User Interface
- Clear progress indicators
- Intuitive project organization
- Easy access to generated content

## Limitations and Considerations

- Maximum number of articles per project
- API rate limiting considerations
- Resource usage optimization