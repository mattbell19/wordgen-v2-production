# WordGen v2 - Technical Architecture Documentation

## 🏗️ System Architecture Overview

WordGen v2 is a full-stack web application built with modern technologies and deployed on Heroku. This document provides a comprehensive overview of the technical architecture, dependencies, and system design.

**🌐 Live Application**: https://wordgen-v2-production-15d78da87625.herokuapp.com/

---

## 📊 Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client (SPA)  │    │  Express Server │    │   PostgreSQL    │
│                 │    │                 │    │    Database     │
│  React + Vite   │◄──►│  Node.js + TS   │◄──►│                 │
│                 │    │                 │    │   Heroku PG     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Static Assets  │    │  Session Store  │    │  Queue System   │
│                 │    │                 │    │                 │
│  Heroku Dyno    │    │  Memory Store   │    │  Background     │
│                 │    │  (Redis Future) │    │  Processing     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## 🎯 Technology Stack

### Frontend Stack
```typescript
// Core Framework
React 18.2.0              // UI framework
TypeScript 5.0+           // Type safety
Vite 4.3.9                // Build tool and dev server

// State Management
@tanstack/react-query 4.29.0  // Server state management
React Context             // Client state management

// Routing & Navigation
React Router 6.x          // Client-side routing

// Styling
CSS3 + Custom Components  // Replaced Material-UI for performance
Responsive Design         // Mobile-first approach

// HTTP Client
Fetch API                 // Native browser API
```

### Backend Stack
```typescript
// Runtime & Framework
Node.js 24.1.0           // JavaScript runtime
Express.js 4.x           // Web framework
TypeScript 5.0+          // Type safety

// Database & ORM
PostgreSQL 15+           // Primary database
Drizzle ORM              // Type-safe database queries
pg (node-postgres)       // PostgreSQL client

// Authentication & Security
express-session          // Session management
bcrypt                   // Password hashing
CORS                     // Cross-origin resource sharing
Helmet                   // Security headers

// Development & Build
tsx                      // TypeScript execution
esbuild                  // Fast TypeScript compilation
```

### Infrastructure & Deployment
```yaml
Platform: Heroku
  - Dyno Type: Eco (1 dyno)
  - Stack: heroku-24
  - Node.js: 24.1.0

Database: PostgreSQL
  - Addon: Essential ($5/month)
  - Connection Pooling: Built-in
  - SSL: Required

Build Process:
  - Client: Vite → dist/public/
  - Server: TypeScript → dist/server/
  - Assets: Served by Express
```

---

## 🗄️ Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  first_name TEXT,
  last_name TEXT,
  is_admin BOOLEAN DEFAULT false,
  subscription_tier TEXT DEFAULT 'free',
  article_credits_remaining INTEGER DEFAULT 3,
  total_articles_generated INTEGER DEFAULT 0,
  active_team_id INTEGER,
  status TEXT DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  last_login_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Articles Table
```sql
CREATE TABLE articles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  meta_description TEXT,
  keywords TEXT[],
  status TEXT DEFAULT 'draft',
  word_count INTEGER DEFAULT 0,
  seo_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Teams & Collaboration
```sql
CREATE TABLE teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);
```

#### Queue Processing
```sql
CREATE TABLE article_queues (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  batch_name TEXT,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  total_items INTEGER NOT NULL,
  completed_items INTEGER DEFAULT 0,
  failed_items INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
```

### Database Indexes
```sql
-- Performance indexes
CREATE INDEX users_email_idx ON users(email);
CREATE INDEX articles_user_id_idx ON articles(user_id);
CREATE INDEX articles_status_idx ON articles(status);
CREATE INDEX teams_owner_id_idx ON teams(owner_id);
CREATE INDEX article_queues_user_id_idx ON article_queues(user_id);
CREATE INDEX article_queues_status_idx ON article_queues(status);
```

---

## 🔐 Authentication & Security

### Session Management
```typescript
// Session Configuration
{
  store: new MemoryStore(),        // TODO: Upgrade to Redis
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,                  // HTTPS only
    httpOnly: true,               // Prevent XSS
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'strict'            // CSRF protection
  },
  rolling: true                   // Extend session on activity
}
```

### Authentication Middleware
```typescript
// Route Protection
app.use('/api/*', (req, res, next) => {
  // Skip public routes
  if (isPublicRoute(req.path)) return next();
  
  // Check session
  if (!req.session?.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  
  next();
});
```

### Security Headers
```typescript
// CORS Configuration
{
  origin: [
    'https://wordgen.io',
    'https://www.wordgen.io',
    'https://wordgen-v2-production-15d78da87625.herokuapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
}

// Content Security Policy
{
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'"]
  }
}
```

---

## 🚀 Build & Deployment Process

### Local Development
```bash
# Install dependencies
npm install

# Start development servers
npm run dev          # Starts both client and server
npm run dev:client   # Vite dev server (port 4002)
npm run dev:server   # Express server (port 3001)

# Build for production
npm run build        # Builds both client and server
npm run build:client # Vite build → dist/public/
npm run build:server # TypeScript → dist/server/
```

### Heroku Deployment
```json
// package.json scripts
{
  "heroku-postbuild": "npm run build:client && npm run build:server",
  "start": "node dist/server/index.js"
}
```

### Build Pipeline
```
1. Install Dependencies
   ├── npm ci (production dependencies only)
   
2. Build Client (Vite)
   ├── TypeScript compilation
   ├── Asset optimization
   ├── Bundle generation
   └── Output: dist/public/
   
3. Build Server (TypeScript)
   ├── TypeScript compilation
   ├── Source map generation
   └── Output: dist/server/
   
4. Start Application
   └── node dist/server/index.js
```

---

## 📡 API Architecture

### RESTful Endpoints
```typescript
// Authentication
POST   /api/register     // User registration
POST   /api/login        // User login
POST   /api/logout       // User logout
GET    /api/user         // Current user info

// Articles
GET    /api/articles     // List user articles
POST   /api/articles     // Create new article
GET    /api/articles/:id // Get specific article
PUT    /api/articles/:id // Update article
DELETE /api/articles/:id // Delete article

// Teams
GET    /api/teams        // List user teams
POST   /api/teams        // Create team
GET    /api/teams/:id    // Get team details
PUT    /api/teams/:id    // Update team
DELETE /api/teams/:id    // Delete team

// Queue Processing
POST   /api/queue/batch  // Submit batch job
GET    /api/queue/:id    // Get queue status
DELETE /api/queue/:id    // Cancel queue job
```

### Response Format
```typescript
// Success Response
{
  success: true,
  data: any,
  message?: string
}

// Error Response
{
  success: false,
  message: string,
  error?: string
}
```

---

## 🔄 Data Flow Architecture

### Client-Server Communication
```
1. User Action (Frontend)
   ↓
2. API Request (HTTP/JSON)
   ↓
3. Authentication Middleware
   ↓
4. Route Handler (Express)
   ↓
5. Database Query (Drizzle ORM)
   ↓
6. PostgreSQL Database
   ↓
7. Response Processing
   ↓
8. JSON Response
   ↓
9. Frontend State Update (React Query)
   ↓
10. UI Re-render (React)
```

### State Management
```typescript
// Server State (React Query)
const { data: user } = useQuery({
  queryKey: ['user'],
  queryFn: fetchUser,
  staleTime: 5 * 60 * 1000 // 5 minutes
});

// Client State (React Context)
const { theme, setTheme } = useContext(ThemeContext);
```

---

## 📈 Performance Considerations

### Frontend Optimizations
- **Code Splitting**: Lazy loading of routes and components
- **Bundle Size**: Removed heavy dependencies (Material-UI)
- **Caching**: React Query for server state caching
- **Asset Optimization**: Vite's built-in optimizations

### Backend Optimizations
- **Database Indexing**: Strategic indexes for common queries
- **Connection Pooling**: PostgreSQL connection pooling
- **Middleware Order**: Optimized middleware execution order
- **Static Assets**: Efficient static file serving

### Database Optimizations
- **Query Optimization**: Efficient SQL queries via Drizzle ORM
- **Index Strategy**: Indexes on frequently queried columns
- **Connection Management**: Proper connection lifecycle management

---

## 🛠️ Development Tools & Workflow

### Code Quality
```json
// TypeScript configuration
{
  "strict": true,
  "noImplicitAny": true,
  "strictNullChecks": true
}

// ESLint + Prettier
// Consistent code formatting and linting
```

### Development Environment
```bash
# Environment Variables
NODE_ENV=development
DATABASE_URL=postgresql://localhost:5432/wordgen_dev
SESSION_SECRET=dev-secret-key
PORT=3001
```

### Debugging & Monitoring
- **Console Logging**: Structured logging throughout application
- **Error Handling**: Comprehensive error catching and reporting
- **Health Checks**: Basic health check endpoints

---

This technical architecture provides a solid foundation for WordGen v2's continued development and scaling.
