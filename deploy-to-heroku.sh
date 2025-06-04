#!/bin/bash

# WordGen v2 Enhanced Dual Format System - Heroku Deployment Script
# This script helps deploy the enhanced system to Heroku

echo "🚀 WordGen v2 Enhanced Dual Format System - Heroku Deployment"
echo "=============================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Heroku CLI is installed
if ! command -v heroku &> /dev/null; then
    print_error "Heroku CLI is not installed. Please install it first:"
    echo "https://devcenter.heroku.com/articles/heroku-cli"
    exit 1
fi

print_success "Heroku CLI found"

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    print_warning "Not logged in to Heroku. Please login:"
    heroku login
fi

print_success "Logged in to Heroku as $(heroku auth:whoami)"

# Get app name
echo ""
print_status "Enter your Heroku app name (or press Enter to create a new one):"
read -r APP_NAME

if [ -z "$APP_NAME" ]; then
    print_status "Creating a new Heroku app..."
    APP_NAME=$(heroku create --json | jq -r '.name')
    print_success "Created new app: $APP_NAME"
else
    print_status "Using existing app: $APP_NAME"
    heroku git:remote -a "$APP_NAME"
fi

# Check if app exists
if ! heroku apps:info -a "$APP_NAME" &> /dev/null; then
    print_error "App $APP_NAME does not exist. Please check the name or create it first."
    exit 1
fi

print_success "Connected to app: $APP_NAME"

# Add Heroku Postgres if not already added
print_status "Checking for Heroku Postgres addon..."
if ! heroku addons -a "$APP_NAME" | grep -q "heroku-postgresql"; then
    print_status "Adding Heroku Postgres addon..."
    heroku addons:create heroku-postgresql:essential-0 -a "$APP_NAME"
    print_success "Heroku Postgres added"
else
    print_success "Heroku Postgres already exists"
fi

# Set essential environment variables
echo ""
print_status "Setting up environment variables..."

# Check for required variables
echo ""
print_warning "Please provide the following required environment variables:"

# OpenAI API Key
if [ -z "$(heroku config:get OPENAI_API_KEY -a "$APP_NAME")" ]; then
    echo -n "OpenAI API Key (sk-...): "
    read -r OPENAI_KEY
    if [ -n "$OPENAI_KEY" ]; then
        heroku config:set OPENAI_API_KEY="$OPENAI_KEY" -a "$APP_NAME"
        print_success "OpenAI API Key set"
    fi
else
    print_success "OpenAI API Key already set"
fi

# Session Secret
if [ -z "$(heroku config:get SESSION_SECRET -a "$APP_NAME")" ]; then
    echo -n "Session Secret (or press Enter to generate): "
    read -r SESSION_SECRET
    if [ -z "$SESSION_SECRET" ]; then
        SESSION_SECRET=$(openssl rand -base64 32)
    fi
    heroku config:set SESSION_SECRET="$SESSION_SECRET" -a "$APP_NAME"
    print_success "Session Secret set"
else
    print_success "Session Secret already set"
fi

# Stripe Keys
if [ -z "$(heroku config:get STRIPE_SECRET_KEY -a "$APP_NAME")" ]; then
    echo -n "Stripe Secret Key (sk_...): "
    read -r STRIPE_SECRET
    if [ -n "$STRIPE_SECRET" ]; then
        heroku config:set STRIPE_SECRET_KEY="$STRIPE_SECRET" -a "$APP_NAME"
        print_success "Stripe Secret Key set"
    fi
else
    print_success "Stripe Secret Key already set"
fi

if [ -z "$(heroku config:get STRIPE_PUBLISHABLE_KEY -a "$APP_NAME")" ]; then
    echo -n "Stripe Publishable Key (pk_...): "
    read -r STRIPE_PUBLIC
    if [ -n "$STRIPE_PUBLIC" ]; then
        heroku config:set STRIPE_PUBLISHABLE_KEY="$STRIPE_PUBLIC" -a "$APP_NAME"
        print_success "Stripe Publishable Key set"
    fi
else
    print_success "Stripe Publishable Key already set"
fi

# Resend API Key
if [ -z "$(heroku config:get RESEND_API_KEY -a "$APP_NAME")" ]; then
    echo -n "Resend API Key (re_...): "
    read -r RESEND_KEY
    if [ -n "$RESEND_KEY" ]; then
        heroku config:set RESEND_API_KEY="$RESEND_KEY" -a "$APP_NAME"
        print_success "Resend API Key set"
    fi
else
    print_success "Resend API Key already set"
fi

# From Email
if [ -z "$(heroku config:get FROM_EMAIL -a "$APP_NAME")" ]; then
    echo -n "From Email (noreply@yourdomain.com): "
    read -r FROM_EMAIL
    if [ -n "$FROM_EMAIL" ]; then
        heroku config:set FROM_EMAIL="$FROM_EMAIL" -a "$APP_NAME"
        print_success "From Email set"
    fi
else
    print_success "From Email already set"
fi

# Set application URLs
APP_URL="https://$APP_NAME.herokuapp.com"
heroku config:set FRONTEND_URL="$APP_URL" -a "$APP_NAME"
heroku config:set BACKEND_URL="$APP_URL" -a "$APP_NAME"
heroku config:set CORS_ORIGIN="$APP_URL" -a "$APP_NAME"
print_success "Application URLs set to $APP_URL"

# Optional: Anthropic API Key
echo ""
print_status "Optional: Anthropic API Key for backup AI (press Enter to skip):"
read -r ANTHROPIC_KEY
if [ -n "$ANTHROPIC_KEY" ]; then
    heroku config:set ANTHROPIC_API_KEY="$ANTHROPIC_KEY" -a "$APP_NAME"
    print_success "Anthropic API Key set"
fi

# Commit and deploy
echo ""
print_status "Preparing for deployment..."

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes. Committing them now..."
    git add .
    git commit -m "Enhanced dual format system ready for deployment"
    print_success "Changes committed"
fi

# Deploy to Heroku
echo ""
print_status "Deploying to Heroku..."
print_warning "This may take several minutes..."

if git push heroku main; then
    print_success "Deployment successful!"
else
    print_error "Deployment failed. Check the logs above for details."
    exit 1
fi

# Wait a moment for the app to start
print_status "Waiting for app to start..."
sleep 10

# Check app status
echo ""
print_status "Checking app status..."
heroku ps -a "$APP_NAME"

# Open the app
echo ""
print_status "Opening the app in your browser..."
heroku open -a "$APP_NAME"

# Final instructions
echo ""
print_success "🎉 Deployment Complete!"
echo "=============================================================="
print_status "Your enhanced WordGen v2 app is now live at:"
echo "   $APP_URL"
echo ""
print_status "✅ Enhanced Features Deployed:"
echo "   • Dual Format Article Generation (Universal Guide + Technical/Tutorial)"
echo "   • Intelligent Format Selection"
echo "   • 90+ Quality Targeting"
echo "   • Competitor-Level Content Standards"
echo "   • Enhanced Visual Elements"
echo ""
print_status "🧪 Test the System:"
echo "   1. Navigate to Article Writer"
echo "   2. Try 'business tax deductions' (Universal Guide format)"
echo "   3. Try 'instagram story dimensions' (Technical/Tutorial format)"
echo "   4. Verify 90+ quality scores and appropriate format selection"
echo ""
print_status "📊 Monitor with:"
echo "   heroku logs --tail -a $APP_NAME"
echo ""
print_status "🔧 Manage config:"
echo "   heroku config -a $APP_NAME"
echo ""
print_warning "Remember to test both article formats thoroughly!"
print_success "Happy article generating! 🚀"
