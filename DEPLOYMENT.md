# WordGen v2 Deployment Guide

## Deployment Workflow

### Branch Strategy
- All changes must be pushed directly to the `main` branch
- Each push to `main` triggers an automatic deployment
- No feature branches or PRs - changes go straight to production
- Extra care needed when making changes as they affect production immediately

## Deployment Configuration

### Environment Requirements
- Node.js: v20.11.1 or higher
- NPM: v10.x or higher

### NPM Configuration (.npmrc)
```
engine-strict=true
legacy-peer-deps=true
node-linker=hoisted
optional=true
```

## Tech Stack

### Frontend
- React 18.x
- Vite (Build tool)
- TypeScript
- @tanstack/react-query v4.29.19 (Data fetching)
- Tailwind CSS (Styling)
- Radix UI (Component library)
- Framer Motion (Animations)
- React Router DOM v7
- Zustand (State management)

### Backend
- Node.js (v20.x)
- Express.js
- TypeScript
- PostgreSQL (via Drizzle ORM)
- Redis (Session management)
- Jest (Testing)

### Key Dependencies
- @tanstack/react-query: ^4.29.19
- express: ^4.21.2
- drizzle-orm: ^0.39.3
- node-fetch: ^2.6.9 (for CommonJS compatibility)
- vite: ^5.4.14
- typescript: ^5.7.3

## Build Process

### Build Scripts
```json
{
  "dev:server": "tsx server/index.ts",
  "dev:client": "vite",
  "dev": "concurrently \"npm run dev:server\" \"npm run dev:client\"",
  "build:client": "NODE_ENV=production vite build --mode production",
  "build:server": "NODE_ENV=production esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist --sourcemap --minify",
  "build": "npm run clean && npm run build:client && npm run build:server",
  "start": "NODE_ENV=production node dist/index.js"
}
```

### Build Steps
1. Clean previous build artifacts
2. Build client-side code with Vite
3. Build server-side code with esbuild
4. Output to `dist` directory

## Testing Requirements

For all new features:
1. Create test files alongside implementation files (.test.ts/.test.tsx)
2. Test both success and error scenarios
3. Mock external dependencies appropriately
4. Aim for 80% code coverage
5. Run tests before pushing to main

## Monitoring

- Health check endpoint: `/api/health`
- Health check timeout: 100ms
- Automatic restart on failure
- Monitor production logs for issues

## Best Practices

1. Always test locally before pushing to main
2. Use proper error handling and logging
3. Follow TypeScript best practices
4. Keep dependencies up to date
5. Monitor build logs for any issues
6. Document significant changes
7. Be cautious with database migrations

## Common Issues & Solutions

1. Rollup Dependencies
   - Ensure all platform-specific Rollup packages are included
   - Use --include=optional flag during installation

2. Node.js Version Mismatch
   - Ensure local development uses Node.js v20.11.1
   - Check engine requirements in package.json

3. Module Resolution
   - Use proper path aliases
   - Ensure vite.config.ts has correct resolve configurations

## Deployment Checklist

Before pushing to main:
- [ ] All tests pass
- [ ] Build succeeds locally
- [ ] No TypeScript errors
- [ ] Dependencies are up to date
- [ ] Documentation is updated
- [ ] No sensitive data in commits
- [ ] Proper error handling implemented
