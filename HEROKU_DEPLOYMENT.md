# WordGen v2 Heroku Deployment Guide

## Overview
This guide covers deploying WordGen v2 to a fresh Heroku environment with a new PostgreSQL database and complete environment setup.

## Prerequisites
- Heroku CLI installed
- Git repository
- Heroku account
- All required API keys and credentials

## Fresh Heroku Deployment

### 1. Create Heroku Application
```bash
# Login to Heroku
heroku login

# Create new application
heroku create your-wordgen-app-name

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:essential-0

# Set buildpack
heroku buildpacks:set heroku/nodejs
```

### 2. Environment Variables Setup
Set all required environment variables:

```bash
# Database (automatically set by Heroku PostgreSQL addon)
# DATABASE_URL is automatically configured

# Server Configuration
heroku config:set NODE_ENV=production
heroku config:set PORT=3000

# Session Configuration
heroku config:set SESSION_SECRET=$(openssl rand -base64 32)

# OpenAI Configuration
heroku config:set OPENAI_API_KEY=your-openai-api-key

# Anthropic Configuration
heroku config:set ANTHROPIC_API_KEY=your-anthropic-api-key

# Stripe Configuration
heroku config:set STRIPE_SECRET_KEY=sk_live_your-stripe-secret-key
heroku config:set STRIPE_PUBLISHABLE_KEY=pk_live_your-stripe-publishable-key
heroku config:set STRIPE_WEBHOOK_SECRET=whsec_your-stripe-webhook-secret

# Email Configuration (Resend)
heroku config:set RESEND_API_KEY=your-resend-api-key
heroku config:set FROM_EMAIL=noreply@yourdomain.com

# Google OAuth Configuration
heroku config:set GOOGLE_CLIENT_ID=your-google-client-id
heroku config:set GOOGLE_CLIENT_SECRET=your-google-client-secret

# Google Search Console API
heroku config:set GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your-gsc-client-id
heroku config:set GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your-gsc-client-secret

# DataForSEO API
heroku config:set DATAFORSEO_LOGIN=your-dataforseo-login
heroku config:set DATAFORSEO_PASSWORD=your-dataforseo-password

# PostHog Analytics
heroku config:set POSTHOG_API_KEY=your-posthog-api-key
heroku config:set POSTHOG_HOST=https://app.posthog.com

# Application URLs
heroku config:set FRONTEND_URL=https://your-wordgen-app-name.herokuapp.com
heroku config:set BACKEND_URL=https://your-wordgen-app-name.herokuapp.com

# Security Configuration
heroku config:set CORS_ORIGIN=https://your-wordgen-app-name.herokuapp.com
heroku config:set ALLOWED_ORIGINS=https://your-wordgen-app-name.herokuapp.com

# Rate Limiting
heroku config:set RATE_LIMIT_WINDOW_MS=900000
heroku config:set RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
heroku config:set ENABLE_REGISTRATION=true
heroku config:set ENABLE_EMAIL_VERIFICATION=true
heroku config:set MAINTENANCE_MODE=false
```

### 3. Deploy Application
```bash
# Add Heroku remote
heroku git:remote -a your-wordgen-app-name

# Deploy
git push heroku main
```

### 4. Database Setup
The database will be automatically migrated during deployment via the release phase.
You can also run migrations manually:

```bash
# Run fresh database setup
heroku run npm run db:fresh

# Or run pending migrations
heroku run npm run db:migrate

# Check migration status
heroku run npm run db:status
```

### 5. Post-Deployment Verification
```bash
# Check application logs
heroku logs --tail

# Check dyno status
heroku ps

# Open application
heroku open

# Check database connection
heroku run node -e "
const { checkDatabaseConnection } = require('./dist/server/db/index.js');
checkDatabaseConnection().then(console.log);
"
```

### 6. Domain Configuration (Optional)
```bash
# Add custom domain
heroku domains:add yourdomain.com

# Update environment variables for custom domain
heroku config:set FRONTEND_URL=https://yourdomain.com
heroku config:set BACKEND_URL=https://yourdomain.com
heroku config:set CORS_ORIGIN=https://yourdomain.com
heroku config:set ALLOWED_ORIGINS=https://yourdomain.com
```

## Required API Keys and Services

### Essential Services
1. **OpenAI API** - For article generation
2. **Anthropic API** - For AI features
3. **Stripe** - For payment processing
4. **Resend** - For email delivery
5. **PostgreSQL** - Database (provided by Heroku addon)

### Optional Services
1. **Google OAuth** - For Google login
2. **Google Search Console API** - For SEO features
3. **DataForSEO API** - For SEO audits
4. **PostHog** - For analytics

## Security Checklist

- [ ] All API keys are set as environment variables
- [ ] SESSION_SECRET is a strong, randomly generated key
- [ ] CORS origins are properly configured
- [ ] Rate limiting is enabled
- [ ] SSL is enforced (automatic on Heroku)
- [ ] Database connections use SSL
- [ ] Email verification is enabled for production

## Monitoring and Maintenance

### Health Checks
The application includes built-in health checks:
- `/health` - Basic health check
- `/health/db` - Database connection check

### Logging
```bash
# View real-time logs
heroku logs --tail

# View specific number of lines
heroku logs -n 500

# Filter logs by source
heroku logs --source app
```

### Scaling
```bash
# Scale web dynos
heroku ps:scale web=2

# Check current dyno usage
heroku ps
```

## Troubleshooting

### Common Issues
1. **Build failures** - Check Node.js version compatibility
2. **Database connection errors** - Verify DATABASE_URL is set
3. **Missing environment variables** - Check all required vars are set
4. **CORS errors** - Verify CORS_ORIGIN matches your domain

### Debug Commands
```bash
# Check environment variables
heroku config

# Run one-off dyno for debugging
heroku run bash

# Check database status
heroku pg:info

# Reset database (DANGER: destroys all data)
heroku pg:reset DATABASE_URL --confirm your-app-name
```

## Backup and Recovery

### Database Backups
```bash
# Create manual backup
heroku pg:backups:capture

# List backups
heroku pg:backups

# Download backup
heroku pg:backups:download
```

### Application Rollback
```bash
# View releases
heroku releases

# Rollback to previous release
heroku rollback v123
```

## Performance Optimization

### Recommended Addons
- **Heroku Redis** - For session storage and caching
- **New Relic** - For application monitoring
- **Papertrail** - For log management

```bash
# Add Redis for session storage
heroku addons:create heroku-redis:mini
```

## Support and Resources

- [Heroku Documentation](https://devcenter.heroku.com/)
- [Node.js on Heroku](https://devcenter.heroku.com/articles/nodejs-support)
- [PostgreSQL on Heroku](https://devcenter.heroku.com/articles/heroku-postgresql)

---

**Note**: This deployment creates a completely fresh environment. Make sure to update all webhook URLs and API configurations to point to your new Heroku application.
