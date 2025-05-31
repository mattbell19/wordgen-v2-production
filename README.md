# WordGen v2 🚀

Wordgen is a professional AI-powered content generation platform that helps users create high-quality articles, research keywords, and manage their content efficiently.

**🌐 Live Application**: https://wordgen-v2-production-15d78da87625.herokuapp.com/

## 🎉 Deployment Status

✅ **Successfully Deployed & Functional on Heroku**
- Authentication system working (registration, login, sessions)
- Database schema complete with all required tables
- API endpoints returning proper JSON responses
- Client application building and serving correctly
- All major dependency conflicts resolved

### Test Credentials
- **Email**: `test@example.com` | **Password**: `password123`
- **Admin**: `admin@wordgen.com` | **Password**: `admin123` ⚠️ *Change in production*

### 📚 Documentation
- **[Deployment Fixes](./DEPLOYMENT_FIXES.md)** - Complete list of issues resolved
- **[Technical Architecture](./TECHNICAL_ARCHITECTURE.md)** - System architecture details
- **[Next Steps](./NEXT_STEPS.md)** - Development roadmap and priorities

## Features

### Article Generation
- AI-powered article creation with Claude 3.5 Sonnet
- Customizable tone and writing style
- Adjustable word count
- Support for internal linking
- Content preview with editing capabilities

### Content Management
- View and manage all generated articles
- Article editing and organization
- Download options (TXT and DOCX formats)
- Content analytics and metrics

### Keyword Research
- Advanced keyword analysis
- Search volume and difficulty scores
- Keyword list management
- Filtering and sorting options

### User Dashboard
- Comprehensive usage statistics
- Quick actions for common tasks
- Recent activity tracking
- Account overview with credit usage

### SEO Audit System

The WordGen platform includes a comprehensive SEO audit system that helps users analyze and improve their website's search engine optimization. The system uses the DataForSEO API to perform in-depth website analysis.

#### Key Features

- **Comprehensive Website Scanning**: Analyzes entire websites or specific sections based on URL patterns
- **Technical SEO Checks**: Identifies issues with page speed, mobile-friendliness, and technical SEO factors
- **Content Analysis**: Evaluates content quality, keyword usage, and duplicate content
- **Link Analysis**: Identifies broken links, analyzes internal linking structure, and evaluates external links
- **Real-time Analysis**: Provides instant analysis of individual pages
- **Detailed Reports**: Generates comprehensive reports with actionable recommendations

#### API Integration

The SEO Audit System uses DataForSEO's API with the following features:
- Robust error handling with automatic retries
- Rate limiting protection
- Efficient caching for frequently accessed data
- CommonJS compatibility with node-fetch v2.6.9
- Comprehensive test coverage with Jest
- Proper TypeScript typing for all API responses

#### API Endpoints

- `POST /api/seo-audit` - Create a new SEO audit task
- `GET /api/seo-audit/:taskId` - Get the status and summary of an SEO audit task
- `GET /api/seo-audit/:taskId/pages` - Get detailed page analysis from an audit
- `GET /api/seo-audit/:taskId/resources` - Get resource analysis (JS, CSS, images, etc.)
- `GET /api/seo-audit/:taskId/links` - Get link analysis data
- `GET /api/seo-audit/:taskId/duplicate-tags` - Get pages with duplicate meta tags
- `DELETE /api/seo-audit/:taskId` - Cancel an ongoing SEO audit task
- `POST /api/seo-audit/instant` - Get instant analysis of a single page

## Recent Improvements

### Content Security Policy (CSP)
- Fixed CSP configuration to allow Google Fonts and Stripe.js
- Implemented more permissive CSP in development mode
- Added proper CSP headers for production

### Database Management
- Created comprehensive database setup script
- Added script to run database setup
- Improved error handling for database operations

### Authentication
- Enhanced session management
- Improved login validation
- Added better error handling for authentication

### Article Generation
- Improved error handling in article generation service
- Added validation for article generation parameters
- Enhanced logging for debugging

## Next Steps

### SEO Audit System Enhancement
1. Implement rate limiting for API endpoints
2. Add caching layer for frequently accessed data
3. Enhance error reporting with detailed stack traces
4. Add comprehensive logging system
5. Implement automated cleanup for expired tasks
6. Add unit tests for new functionality
7. Create user documentation
8. Implement frontend components
9. Add export functionality for reports

### General Improvements
1. Enhance test coverage across all components
2. Implement performance monitoring
3. Add user feedback system
4. Enhance security measures
5. Improve documentation
6. Set up CI/CD pipeline for GitHub and Railway deployment

### Development Guidelines
1. Follow TypeScript best practices
2. Maintain consistent error handling
3. Write comprehensive tests
4. Document all new features
5. Keep dependencies updated

## Architecture

### Frontend
- React with TypeScript
- Vite for fast development and bundling
- React Query for data fetching and caching
- Shadcn UI components for consistent design
- React Hook Form with Zod for form validation

### Backend
- Node.js with Express
- PostgreSQL database with Drizzle ORM
- Claude AI integration for content generation
- Session-based authentication
- Comprehensive error handling

## Error Handling System

We've implemented a robust error handling system consisting of:

1. **Reusable Error Components**:
   - `ErrorDisplay`: A flexible component for displaying different types of errors
   - `NetworkError`: For connection issues
   - `AuthenticationError`: For auth-related errors
   - `ValidationError`: For form/input validation errors
   - `NotFoundError`: For missing resources

2. **ErrorBoundary Component**:
   - Catches and gracefully handles React component errors
   - Provides a user-friendly fallback UI
   - Includes retry functionality

3. **useApi Hook**:
   - Built-in error handling
   - Automatic retry with exponential backoff
   - Consistent error formatting
   - Toast notifications for user feedback

## Authentication Flow

The authentication system uses a session-based approach:

1. User registers or logs in via `/api/register` or `/api/login`
2. Server creates a session and stores session ID in cookies
3. Client uses this session for authenticated requests
4. User data is accessed via React Query with consistent caching

## Project Setup

### Prerequisites
- Node.js (v16+)
- PostgreSQL
- API keys for Claude AI

### Installation

1. Clone the repository:
```
git clone https://github.com/yourusername/wordgen.git
cd wordgen
```

2. Install dependencies:
```
npm install
```

3. Create a `.env` file with the following variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/wordgen
CLAUDE_API_KEY=your_claude_api_key
SESSION_SECRET=your_session_secret
NODE_ENV=development
```

4. Run database setup:
```
npm run db:setup
```

5. Start the development server:
```
npm run dev
```

## Development Workflow

1. **Start the server and client**:
   ```
   npm run dev
   ```

2. **Run tests**:
   ```
   npm test
   ```

3. **Build for production**:
   ```
   npm run build
   ```

## Deployment

The application can be deployed to any Node.js hosting service.

1. Build the application:
   ```
   npm run build
   ```

2. Set the necessary environment variables:
   - `NODE_ENV=production`
   - `PORT=3001`
   - `DATABASE_URL=<your-postgresql-connection-string>`
   - `SESSION_SECRET=<your-session-secret>`
   - `OPENAI_API_KEY=<your-openai-api-key>`
   - `ANTHROPIC_API_KEY=<your-anthropic-api-key>`

3. Set up the database:
   ```
   npm run db:setup
   ```

4. Start the application:
   ```
   npm start
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Claude AI](https://claude.ai) for powering the article generation
- [Shadcn UI](https://ui.shadcn.com/) for the component library
- All the contributors who have helped improve Wordgen

## Testing

The project has a comprehensive test suite using Jest:

1. **Run all tests**:
   ```
   npm test
   ```

2. **Run tests in watch mode**:
   ```
   npm run test:watch
   ```

3. **Generate test coverage report**:
   ```
   npm run test:coverage
   ```

The test suite includes:
- Unit tests for client hooks and utilities
- Unit tests for server services and API handlers
- Mock implementations for fetch and external services
- Custom test utilities for common testing scenarios