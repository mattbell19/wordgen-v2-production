#!/bin/bash

# Setup Redis on Heroku for WordGen v2
# This script adds Redis to your Heroku app to fix session persistence issues

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Check if user is logged in to Heroku
if ! heroku auth:whoami &> /dev/null; then
    print_error "You are not logged in to Heroku. Please run 'heroku login' first."
    exit 1
fi

# Get app name
APP_NAME=${1:-wordgen-v2-production-15d78da87625}

print_status "Setting up Redis for Heroku app: $APP_NAME"

# Check if app exists
if ! heroku apps:info $APP_NAME &> /dev/null; then
    print_error "App '$APP_NAME' not found. Please check the app name."
    exit 1
fi

print_success "App '$APP_NAME' found"

# Check if Redis is already installed
print_status "Checking for existing Redis add-ons..."
REDIS_ADDONS=$(heroku addons --app $APP_NAME | grep -i redis || true)

if [ -n "$REDIS_ADDONS" ]; then
    print_warning "Redis add-on already exists:"
    echo "$REDIS_ADDONS"
    print_status "Checking Redis configuration..."
else
    print_status "No Redis add-on found. Installing Heroku Redis..."
    
    # Add Redis add-on (mini plan is free)
    heroku addons:create heroku-redis:mini --app $APP_NAME
    
    print_success "Redis add-on installed successfully"
    
    # Wait a moment for the add-on to be ready
    print_status "Waiting for Redis to be ready..."
    sleep 10
fi

# Get Redis URL
print_status "Retrieving Redis configuration..."
REDIS_URL=$(heroku config:get REDIS_URL --app $APP_NAME)

if [ -z "$REDIS_URL" ]; then
    print_error "Failed to get REDIS_URL. The add-on might not be ready yet."
    print_status "Please wait a few minutes and check with: heroku config --app $APP_NAME"
    exit 1
fi

print_success "Redis URL configured: ${REDIS_URL:0:20}..."

# Test Redis connection
print_status "Testing Redis connection..."
if heroku redis:info --app $APP_NAME &> /dev/null; then
    print_success "Redis connection test passed"
else
    print_warning "Redis connection test failed, but this might be normal during setup"
fi

# Show Redis info
print_status "Redis add-on information:"
heroku addons:info $(heroku addons --app $APP_NAME | grep -i redis | awk '{print $1}') --app $APP_NAME

print_success "Redis setup completed!"
print_status "Next steps:"
echo "1. Deploy your updated code with the Redis session fixes:"
echo "   git add ."
echo "   git commit -m 'Fix session persistence with Redis'"
echo "   git push heroku main"
echo ""
echo "2. Check the logs to verify Redis is working:"
echo "   heroku logs --tail --app $APP_NAME"
echo ""
echo "3. Test authentication - sessions should now persist across dyno restarts"

print_status "Redis configuration details:"
heroku config --app $APP_NAME | grep -i redis
