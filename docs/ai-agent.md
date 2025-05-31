# AI SEO Agent Technical Documentation

## Overview
The AI SEO Agent is a conversational interface that helps users optimize their content and analyze SEO performance. It combines natural language processing with SEO-specific functionality to provide actionable insights and recommendations.

## Architecture

### Frontend Components
- Located in: `client/src/pages/agent.tsx`
- Key components:
  - Chat interface with message history
  - Command parser for special instructions
  - Keyword analysis visualization
  - Conversation persistence
  - Integration with keyword lists

### Data Model
```typescript
interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    suggestedKeywords?: string[];
    contentSuggestions?: string[];
    technicalTips?: string[];
    commandResponse?: {
      type: string;
      data?: {
        keywords?: any[];
        saved?: boolean;
      };
    };
    isWelcome?: boolean;
  };
}

interface Conversation {
  id: number;
  title: string;
  updatedAt: string;
}
```

### Features

#### 1. Command System
Supported commands:
- `/analyze [url]` - Analyze webpage SEO
- `/keywords [topic]` - Research keyword opportunities
- `/audit` - Start basic SEO audit
- `/optimize [text]` - Get content optimization suggestions

#### 2. Keyword Analysis
- Real-time keyword suggestion
- Integration with saved keyword lists
- Keyword metrics and relevance scoring
- Bulk keyword saving functionality

#### 3. Content Optimization
- Real-time content suggestions
- Technical SEO tips
- Content structure recommendations
- Readability analysis

#### 4. Conversation Management
- Persistent chat history
- Conversation retrieval and continuation
- Metadata storage for insights and suggestions

## Integration Points

### 1. Frontend Integration
- Uses @tanstack/react-query for data fetching
- Implements shadcn/ui components for consistent design
- Responsive layout with tailwindcss

### 2. API Endpoints
```typescript
// Chat endpoint
POST /api/ai/chat
Body: {
  content: string;
  listId?: string;
  conversationId?: number;
}

// Conversation endpoints
GET /api/ai/conversations
GET /api/ai/conversations/:id/messages
```

### 3. Database Schema
```typescript
// Conversations Table
conversations {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}

// Messages Table
messages {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id),
  role: text('role').notNull(),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow(),
}
```

## Current Status
- Basic chat functionality implemented
- Command system operational
- Keyword analysis and saving working
- Conversation history implemented
- UI components integrated
- Mobile responsive design completed

## Pending Improvements
1. Enhanced error handling for API failures
2. Caching strategy for frequently accessed data
3. Batch processing for bulk operations
4. Performance optimization for large conversation histories
5. Advanced analytics integration
6. Expanded command set for additional SEO tools

## Usage Guidelines
1. Initialize conversation with general SEO questions or specific commands
2. Use keyword analysis for content optimization
3. Save useful keywords to lists for later use
4. Access conversation history through sidebar
5. Utilize technical tips for implementation guidance
