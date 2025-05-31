# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Added `SeoAuditTask` type definition in `server/db/index.ts` to properly type SEO audit tasks and their results
- Added query builder configuration in `server/db/index.ts` with proper types and relations for SEO audit tasks
- Added proper return type annotations for `findMany` and `findFirst` methods in the query builder
- Implemented tRPC server setup:
  - Added tRPC initialization with proper context and error handling
  - Created protected and public procedure middleware
  - Added user context with authentication checks
  - Implemented root router combining all sub-routers
  - Added type exports for client usage
- Implemented tRPC client setup:
  - Added tRPC client configuration with proper authentication
  - Configured HTTP batch link with credentials
  - Added proper error handling for API responses
- Migrated user routes to tRPC:
  - Added user router with getProfile and updateProfile procedures
  - Implemented proper input validation using Zod
  - Added type-safe error handling
  - Enhanced profile update functionality
- Enhanced subscription management:
  - Migrated to tRPC endpoints for subscription status
  - Added type-safe mutations for plan changes
  - Improved error handling and loading states
  - Enhanced subscription status display
- Advanced keyword filtering functionality
  - Filter by search volume range
  - Filter by difficulty score range
  - Real-time results updating
- Dynamic range sliders for filters
  - Auto-adjusting min/max values based on results
  - Smooth value updates
  - Formatted number display
- Quick action buttons on dashboard for common tasks
- User account status indicators with visual badges
- Account overview card with credit usage progress
- Recent activity feed showing latest actions
- Enhanced empty states with action buttons
- Comprehensive error handling components and utilities:
  - Reusable ErrorDisplay component with different error variants (default, warning, info, network, auth)
  - ErrorBoundary component for catching and gracefully handling React component errors
  - Custom useApi hook with built-in error handling and automatic retry capabilities
  - Specialized error components for common error types (NetworkError, AuthenticationError, ValidationError, NotFoundError)
  - Improved error state display with informative messages and retry options
- Added unit testing setup with Jest for both client and server code
- Implemented unit tests for external link service functionality
- Implemented unit tests for authentication hooks
- Added test utilities and mock configurations
- Added unit tests for GPT article generation service
- Implemented SEO audit system with DataForSEO integration:
  - Created API client with proper rate limiting and error handling
  - Implemented comprehensive SEO audit service 
  - Added API endpoints for website audit tasks
  - Added support for real-time SEO analysis
  - Created schema for detailed SEO reports
- Implemented task management system for SEO audits:
  - Task queuing with priority support
  - Automatic task status monitoring
  - Configurable task retry mechanisms
  - Task cleanup for old/expired tasks
  - User-based task access control
- Comprehensive SEO Audit System with the following features:
  - Strongly-typed DataForSEO API client with automatic retries
  - Task management system for background processing
  - SEO issue detection and prioritization
  - Report generator with performance metrics
  - Caching layer for improved API performance
  - Custom error handling with graceful fallbacks
  - In-depth documentation in `server/services/data-for-seo/README.md`
  - Extensive test coverage for all components

### Changed
- Updated query builder implementation to use correct Drizzle query builder syntax
- Modified task queries to properly handle relations between tasks and results
- Updated SEO routes to use the new query builder and proper types
- Updated Express app to handle tRPC requests alongside REST endpoints
- Migrated API calls from fetch to type-safe tRPC procedures
- Enhanced error handling with proper tRPC error formatting
- Updated authentication flow to work with tRPC context
- Simplified keyword result cards
  - Removed monthly volume trends graph
  - Streamlined metrics display
  - Improved performance by reducing complexity
- Updated results counter to show filtered results count
- Optimized article preview dialog:
  - Improved content loading with smooth fade-in animations
  - Enhanced performance with CSS containment and hardware acceleration
  - Removed IntersectionObserver in favor of simpler, more reliable animations
  - Added proper cleanup on dialog close
  - Fixed content visibility issues in preview mode
- Updated user authentication flow to be more robust
- Improved error handling in registration process
- Enhanced type safety in auth responses
- Updated useUser hook to use the same query key format as useAuth ('user' instead of '/api/user')
- Refactored dashboard to use the centralized authentication hook for better consistency
- Disabled unnecessary query refetching that was causing race conditions
- Improved dashboard layout and responsiveness
- Enhanced visual feedback for account status with color-coded badges
- Truncated long article titles in recent articles list for better display
- Standardized error handling across the application with consistent patterns
- Implemented exponential backoff retry mechanism for failed API requests
- Updated node-fetch implementation:
  - Downgraded to node-fetch v2.6.9 for CommonJS compatibility
  - Updated @types/node-fetch to matching version 2.6.9
  - Updated mock implementations for Jest tests
  - Added ESM/CommonJS compatibility lessons to .cursorrules
  - Improved error handling in DataForSEO client

### Fixed
- Fixed SEO routes import in `server/routes.ts` by changing from named import `{ seoRoutes }` to default import `seoRoutes` to match the export in `seo.ts`
- Fixed TypeScript errors related to missing types and incorrect query builder usage
- Fixed relation handling between SEO audit tasks and their results
- Fixed Content Security Policy (CSP) violations:
  - Added nonce-based script security
  - Implemented environment-specific CSP rules
  - Added proper security headers
  - Enhanced frame and form protection
  - Improved WebSocket handling in development
- Fixed incorrect account page routing:
  - Updated dashboard account button to link to /dashboard/profile instead of /account
  - Ensured consistent routing for account management functionality
  - Improved user experience by preventing 404 errors
- Authentication flow improvements:
  - Fixed session handling during registration
  - Properly handle user data in React Query cache
  - Increased timeout after registration to ensure proper state updates
  - Updated AuthResponse type to match server response structure
- Fixed unit tests for DataForSEO integration:
  - Created proper mocks for node-fetch and node-abort-controller to resolve ESM/CommonJS compatibility issues
  - Updated test files to use CommonJS require for better compatibility with Jest
  - Fixed incorrect endpoint path in API client tests
  - Improved test structure to avoid timeout issues with long-running operations
  - Enhanced error handling test cases to match implementation
  - Fixed cancelAuditTask tests to properly handle async operations
  - Added improved timeout configuration for asynchronous tests
- Fixed node-fetch ESM/CommonJS compatibility issues:
  - Resolved dynamic require errors with node-fetch
  - Updated DataForSEO client to use CommonJS require properly
  - Fixed test suite compatibility with node-fetch v2
  - Improved mock implementations for better Jest compatibility

- UI Improvements:
  - Fixed logo display in dashboard by properly importing and using the logo asset
  - Updated logo import to use Vite's asset handling
  - Adjusted logo size for better visual appearance
  - Added proper Link component wrapping for navigation

### Enhanced
- Improved SEO audit task handling:
  - Enhanced error handling for expired DataForSEO tasks
  - Added graceful handling of task expiration in DataForSEO service
  - Implemented automatic failed status for tasks pending over 24 hours
  - Added database updates for expired tasks
  - Improved logging with better error categorization
  - Enhanced frontend state consistency with backend task status
- Better error handling in keyword research
- Enhanced logging for API requests
- Improved CORS configuration
- Better session handling
- Improved article dialog UI and readability:
  - Added proper HTML content rendering with typography styles
  - Enhanced heading hierarchy and spacing
  - Improved paragraph and list formatting
  - Added support for code blocks and blockquotes
  - Added smooth fade-in animations for content
  - Improved dark mode support
  - Added icons for metadata display
  - Optimized button layout and styling
  - Added proper font handling for headings using Sora font
  - Enhanced accessibility with proper heading structure

## [0.2.0] - 2024-03-20

### Added
- Keyword research functionality
- RapidAPI integration for keyword data
- User authentication system
- Keyword list management
- Basic filtering and sorting

### Changed
- Updated UI to use Shadcn components
- Improved API response handling
- Enhanced error messaging

## [0.1.0] - 2024-03-15

### Added
- Initial project setup
- Basic server structure
- Database integration
- Frontend scaffolding

## [0.1.0] - 2025-01-18
### Enhanced
- Improved internal linking functionality:
  - Fixed internal linking toggle in article generation
  - Added proper sitemap integration for link suggestions
  - Enhanced link rendering in article preview
  - Improved markdown to HTML link conversion
  - Added target="_blank" for external links
  - Fixed user ID propagation for sitemap lookup
  - Enhanced logging for better debugging
  - Improved link relevance in generated content

## [0.1.0] - 2025-01-17
### Added
- Implemented Sitemap Analyzer:
  - Created sitemap analyzer page with URL input form
  - Added sitemap XML fetching and display functionality
  - Implemented database storage for sitemap reports
  - Added historical reports viewing capability
  - Enhanced UI with Shadcn components and responsive design
  - Implemented proper error handling for sitemap fetching
  - Added persistence layer with PostgreSQL integration
  - Previous reports list with timestamp and domain info
- Implemented AI SEO Agent:
  - Created agent.tsx page with chat interface
  - Added AI SEO Agent to sidebar navigation
  - Implemented conversation persistence with history viewing
  - Added keyword analysis and content optimization features
  - Included insights display for SEO suggestions
  - Implemented keyword list integration for saving suggestions
  - Added command-based interactions (/analyze, /keywords, etc.)
  - Enhanced UI with Shadcn components and responsive design
- Implemented team collaboration features:
  - Team creation with single team per user limit
  - Role-based access control with Admin and Member roles
  - Team member invitation system
  - Team management interface with member listing
  - Proper permission checks for team operations
  - Team details view with invitation capabilities
  - Improved UI/UX for team management

### Enhanced
- Improved navigation and routing:
  - Fixed login redirect to dashboard
  - Added proper route handling for authenticated users
  - Enhanced sidebar navigation with clear icons and labels
  - Improved user experience with better visual feedback
- Improved transactional email system:
  - Integrated Resend.com for reliable email delivery
  - Added proper contact management in Resend audience
  - Fixed password reset email flow
  - Enhanced team invitation email system
  - Added comprehensive email logging
  - Fixed JSON response formatting in auth routes

### Fixed
- Enhanced bulk article generation feature:
  - Fixed project tab in My Articles to display all projects correctly
  - Improved article dialog functionality for project articles
  - Enhanced UI feedback during article generation
  - Added comprehensive technical documentation
  - Updated progress tracking for bulk article generation
  - Fixed project settings handling in database

## [0.1.0] - 2025-01-16
### Added
- Enhanced article editor with Lexical rich text editor:
  - Added comprehensive formatting toolbar with bold, italic, underline options
  - Implemented heading styles (H1, H2, H3)
  - Added support for ordered and unordered lists
  - Improved article content display with proper formatting
  - Enhanced editing experience with proper content preservation
  - Fixed dialog layout and scrolling behavior
  - Added automatic content loading for saved articles
- Basic frontend structure with form and preview components
- Article generation form with:
  - Keyword input
  - Tone selection (professional, casual, friendly)
  - Word count slider (300-2000 words)
- Article preview component with:
  - Word count and reading time display
  - Download options (TXT and DOCX formats)
  - Scrollable preview area with proper formatting

### Integrated
- Claude AI integration for article generation using the latest model (claude-3-5-sonnet-20241022)
- Backend API endpoints for article generation
- React Query for API state management
- Form validation using react-hook-form and zod

### Technical Details
- Set up Express backend with TypeScript
- Implemented article generation service with Claude AI
- Created type definitions for article settings and responses
- Added error handling for API requests
- Implemented proper response formatting for Claude AI outputs

### Latest Updates (2025-01-16)
- Enhanced marketing landing page:
  - Updated headline and value proposition for better clarity
  - Added social proof with company logos (Google, WordPress, Shopify)
  - Implemented testimonials section with user success stories
  - Enhanced feature cards with detailed benefits
  - Added trust indicators and free trial messaging
  - Improved overall page layout and visual hierarchy
- Implemented comprehensive profile management:
  - Added dedicated profile settings page accessible from sidebar
  - Created profile update form with fields for name, company, website, timezone
  - Added email notifications toggle
  - Implemented secure profile update API endpoint
  - Enhanced form validation and error handling
  - Added real-time profile data updates
  - Improved user feedback with toast notifications
- Enhanced usage tracking dashboard:
  - Added usage statistics display
  - Implemented total articles generated counter
  - Added total keywords analyzed tracking
  - Created word count statistics
  - Improved dashboard layout and visualization
- Improved sidebar navigation:
  - Added profile settings link to bottom of sidebar
  - Implemented logout functionality
  - Enhanced visual feedback for active routes
  - Improved mobile responsiveness
- Added comprehensive password recovery functionality:
  - Implemented password reset request flow
  - Created password reset token system with secure expiration
  - Added email notification system using nodemailer
  - Created new database table for password reset tokens
  - Implemented frontend reset password pages and forms
  - Added secure token validation and password update logic
  - Enhanced user authentication system with password recovery
  - Improved error handling and user feedback
- Enhanced user authentication system:
  - Fixed router infinite loop issues
  - Improved authentication state management
  - Added proper redirects after login/registration
  - Enhanced form validation and error messaging

### Previous Updates (2025-01-14)
- Implemented My Articles feature:
  - Added articles listing page with grid layout
  - Created ArticleCard component for article preview
  - Implemented loading states with skeleton UI
  - Added download functionality for generated articles
  - Added article preview modal for full content viewing
  - Enhanced user experience with interactive article cards
  - Added download options in preview modal (TXT/DOCX)
- Simplified article writer interface:
  - Streamlined main form to focus on keyword input
  - Added settings dialog for advanced options (word count, writing style, language)
  - Integrated Zustand for global settings management
- Enhanced database integration:
  - Added articles table schema
  - Implemented article storage and retrieval endpoints
  - Added proper relations between users and articles
- Improved keyword research functionality:
  - Added support for free plan API responses
  - Enhanced keyword results display with columns
  - Added visual indicators for difficulty and competition
  - Fixed negative search volume display issues
  - Improved related keywords display with pill-style tags
  - Enhanced grid layout for better data presentation
  - Implemented proper error handling for API responses
- Enhanced saved keyword lists functionality:
  - Fixed accessibility issues in dialog components
  - Improved form handling for creating and editing lists
  - Fixed list refresh after creation

### Notes
- Currently using Claude AI's raw output without humanization
- Basic error handling implemented for API failures
- Frontend provides immediate feedback during article generation process

### Pending
- RapidAPI integration for content humanization (awaiting API host configuration)
- Bulk article generation capability

### Technical Improvements
- Added end-to-end type safety between client and server
- Enhanced developer experience with better type inference
- Improved error handling with structured error responses
- Added proper session handling with credentials

### Technical
- Fixed TypeScript types for auth responses
- Updated Vite asset handling for static files
- Improved session management in Express backend

### Fixed
- TypeScript arithmetic type issues in report calculation
- Interface conflicts in SEO report generation
- Type consistency between DataForSEO API requests and responses

### Technical Improvements
- Added response type definitions for third-party APIs
- Implemented LRU cache with TTL support and statistics tracking
- Created reusable error handling utilities
- Added comprehensive unit tests with proper mocking
- Improved integration with DataForSEO API

### Next Steps
- Implement rate limiting for SEO audit API endpoints
- Add caching layer for frequently accessed SEO data
- Enhance error reporting with detailed stack traces in development
- Add comprehensive logging for SEO audit operations
- Implement automated cleanup for expired SEO audit tasks
- Add unit tests for new SEO audit functionality
- Create user documentation for SEO audit features
- Implement frontend components for SEO audit results
- Add export functionality for SEO audit reports

### Fixed
- Fixed article update functionality:
  - Enhanced Vite proxy configuration to properly handle PATCH requests
  - Improved error handling for non-JSON responses from the server
  - Added better validation for article IDs before sending requests
  - Added detailed error messages for 404 errors when articles don't exist
  - Added comprehensive logging for debugging PATCH requests
  - Improved type safety in the article update process
  - Enhanced response parsing for better user feedback
  - Added proper headers and credentials to PATCH requests
  - Added unit tests for article update error scenarios
  - Improved toast error messages to be more user-friendly