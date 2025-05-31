# WordGen v2 - API Credentials Setup Guide

## 🔑 Complete API Credentials Reference

This guide provides step-by-step instructions for obtaining and configuring all API credentials needed for WordGen v2.

---

## ✅ Essential APIs (Required for Core Functionality)

### 1. OpenAI API Key
**Status**: ✅ **CONFIGURED**
**Purpose**: Article generation, content creation
**Cost**: Pay-per-use (typically $0.002-0.06 per 1K tokens)

**How to get**:
1. Visit https://platform.openai.com/api-keys
2. Sign up/login to your OpenAI account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-` or `sk-`)
5. Set in Heroku: `heroku config:set OPENAI_API_KEY="your-key" --app wordgen-v2-production`

**Current Status**: Already configured ✅

---

### 2. Database URL
**Status**: ✅ **AUTO-CONFIGURED**
**Purpose**: PostgreSQL database connection
**Cost**: $5/month (Heroku Postgres Essential)

**How it works**:
- Automatically provided by Heroku PostgreSQL addon
- No manual configuration needed
- Format: `postgresql://username:password@host:port/database`

**Current Status**: Auto-configured by Heroku ✅

---

### 3. Session Secret
**Status**: ✅ **CONFIGURED**
**Purpose**: Secure user sessions and authentication
**Cost**: Free

**How to generate**:
```bash
# Generate a secure random string
openssl rand -base64 32

# Set in Heroku
heroku config:set SESSION_SECRET="your-generated-secret" --app wordgen-v2-production
```

**Current Status**: Already configured ✅

---

## 💳 Payment Processing (Stripe)

### Stripe API Keys
**Status**: 🔄 **PLACEHOLDER VALUES**
**Purpose**: Payment processing, subscriptions, billing
**Cost**: 2.9% + 30¢ per transaction

**How to get**:
1. Visit https://dashboard.stripe.com/register
2. Create a Stripe account
3. Go to Developers > API keys
4. Copy both keys:
   - **Publishable key** (starts with `pk_test_` or `pk_live_`)
   - **Secret key** (starts with `sk_test_` or `sk_live_`)

**Configuration**:
```bash
# Test keys (for development)
heroku config:set STRIPE_PUBLISHABLE_KEY="pk_test_your_key" --app wordgen-v2-production
heroku config:set STRIPE_SECRET_KEY="sk_test_your_key" --app wordgen-v2-production

# Webhook secret (from Stripe Dashboard > Webhooks)
heroku config:set STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret" --app wordgen-v2-production
```

**Webhook Setup**:
1. In Stripe Dashboard, go to Webhooks
2. Add endpoint: `https://wordgen-v2-production-15d78da87625.herokuapp.com/api/webhooks/stripe`
3. Select events: `payment_intent.succeeded`, `customer.subscription.updated`, etc.
4. Copy webhook secret

---

## 📧 Email Service (Resend)

### Resend API Key
**Status**: 🔄 **PLACEHOLDER VALUES**
**Purpose**: Transactional emails, notifications, password resets
**Cost**: Free tier: 3,000 emails/month, then $20/month

**How to get**:
1. Visit https://resend.com/signup
2. Create account and verify email
3. Go to API Keys section
4. Create new API key
5. Copy the key (starts with `re_`)

**Configuration**:
```bash
heroku config:set RESEND_API_KEY="re_your_api_key" --app wordgen-v2-production
heroku config:set FROM_EMAIL="noreply@yourdomain.com" --app wordgen-v2-production
```

**Domain Setup** (Optional but recommended):
1. Add your domain in Resend dashboard
2. Add DNS records as instructed
3. Verify domain ownership

---

## 🤖 AI Enhancement (Anthropic Claude)

### Anthropic API Key
**Status**: 🔄 **PLACEHOLDER VALUES**
**Purpose**: Additional AI capabilities, Claude integration
**Cost**: Pay-per-use (similar to OpenAI pricing)

**How to get**:
1. Visit https://console.anthropic.com/
2. Sign up for Anthropic account
3. Go to API Keys section
4. Create new API key
5. Copy the key

**Configuration**:
```bash
heroku config:set ANTHROPIC_API_KEY="your_anthropic_key" --app wordgen-v2-production
```

---

## 🔍 SEO & Research APIs (Optional)

### 1. RapidAPI Key
**Purpose**: Keyword research, content humanization
**Cost**: Varies by API (typically $10-50/month)

**How to get**:
1. Visit https://rapidapi.com/
2. Sign up for account
3. Subscribe to relevant APIs
4. Get your RapidAPI key from dashboard

**Configuration**:
```bash
heroku config:set RAPIDAPI_KEY="your_rapidapi_key" --app wordgen-v2-production
heroku config:set RAPIDAPI_HOST="api_host_name" --app wordgen-v2-production
```

### 2. DataForSEO API
**Purpose**: SEO audits, SERP analysis
**Cost**: $0.25 per 1,000 API calls

**How to get**:
1. Visit https://dataforseo.com/
2. Create account
3. Get API credentials from dashboard

**Configuration**:
```bash
heroku config:set DATAFORSEO_LOGIN="your_login" --app wordgen-v2-production
heroku config:set DATAFORSEO_PASSWORD="your_password" --app wordgen-v2-production
```

### 3. SerpAPI Key
**Purpose**: Search engine results data
**Cost**: Free tier: 100 searches/month, then $50/month

**How to get**:
1. Visit https://serpapi.com/
2. Sign up for account
3. Get API key from dashboard

**Configuration**:
```bash
heroku config:set SERPAPI_KEY="your_serpapi_key" --app wordgen-v2-production
```

---

## 🔐 Google Services (OAuth & Search Console)

### Google OAuth Credentials
**Purpose**: Google login, user authentication
**Cost**: Free

**How to get**:
1. Visit https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Google+ API and OAuth consent screen
4. Go to Credentials > Create Credentials > OAuth 2.0 Client ID
5. Set authorized redirect URI: `https://wordgen-v2-production-15d78da87625.herokuapp.com/auth/google/callback`

**Configuration**:
```bash
heroku config:set GOOGLE_CLIENT_ID="your_client_id" --app wordgen-v2-production
heroku config:set GOOGLE_CLIENT_SECRET="your_client_secret" --app wordgen-v2-production
```

### Google Search Console API
**Purpose**: SEO data, search performance analytics
**Cost**: Free

**Setup**:
1. Same Google Cloud Console project
2. Enable Search Console API
3. Create service account or use OAuth credentials
4. Configure redirect URI for Search Console

**Configuration**:
```bash
heroku config:set GOOGLE_SEARCH_CONSOLE_CLIENT_ID="your_gsc_client_id" --app wordgen-v2-production
heroku config:set GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET="your_gsc_client_secret" --app wordgen-v2-production
```

---

## 📊 Analytics (PostHog)

### PostHog API Key
**Purpose**: User analytics, event tracking, feature flags
**Cost**: Free tier: 1M events/month, then $0.00031 per event

**How to get**:
1. Visit https://posthog.com/signup
2. Create account and project
3. Get API key from Project Settings

**Configuration**:
```bash
heroku config:set POSTHOG_API_KEY="your_posthog_key" --app wordgen-v2-production
heroku config:set POSTHOG_HOST="https://app.posthog.com" --app wordgen-v2-production
```

---

## 🚀 Quick Setup Commands

### Set All Essential APIs at Once
```bash
# Replace with your actual API keys
heroku config:set \
  STRIPE_SECRET_KEY="sk_test_your_stripe_key" \
  STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_key" \
  RESEND_API_KEY="re_your_resend_key" \
  ANTHROPIC_API_KEY="your_anthropic_key" \
  --app wordgen-v2-production
```

### Verify Configuration
```bash
heroku config --app wordgen-v2-production
```

---

## 📋 Priority Setup Order

### Phase 1: Core Functionality
1. ✅ OpenAI API (Already done)
2. ✅ Database (Already done)
3. ✅ Session Secret (Already done)

### Phase 2: Business Features
4. 🔄 Stripe (Payment processing)
5. 🔄 Resend (Email service)

### Phase 3: Enhanced Features
6. 🔄 Anthropic (Additional AI)
7. 🔄 Google OAuth (Social login)
8. 🔄 SEO APIs (Enhanced SEO tools)

### Phase 4: Analytics & Optimization
9. 🔄 PostHog (Analytics)
10. 🔄 Additional SEO tools

---

## 💰 Cost Estimation

### Monthly Costs (Estimated)
- **Heroku Hosting**: $7/month (Eco dyno + Postgres)
- **OpenAI API**: $10-50/month (depending on usage)
- **Stripe**: 2.9% + 30¢ per transaction
- **Resend**: $0-20/month (3K emails free)
- **Other APIs**: $10-100/month (optional)

**Total Estimated**: $27-177/month depending on usage and features enabled

---

## 🔧 Troubleshooting

### Common Issues
1. **Invalid API Key**: Double-check key format and permissions
2. **Rate Limits**: Monitor usage and upgrade plans as needed
3. **Webhook Failures**: Verify endpoint URLs and SSL certificates

### Testing API Keys
```bash
# Test OpenAI API
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models

# Test Stripe API
curl -u $STRIPE_SECRET_KEY: https://api.stripe.com/v1/charges
```

---

**Need help with any specific API setup? Check the individual service documentation or contact their support teams.**
