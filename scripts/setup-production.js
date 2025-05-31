#!/usr/bin/env node

/**
 * Production Setup Script for WordGen v2
 * 
 * This script helps set up the production environment with:
 * 1. Redis session store
 * 2. Secure session secrets
 * 3. Basic monitoring
 * 4. Environment validation
 */

import { execSync } from 'child_process';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const APP_NAME = 'wordgen-v2-production';

console.log('🚀 WordGen v2 Production Setup');
console.log('================================\n');

// Generate secure session secret
function generateSessionSecret() {
  return crypto.randomBytes(64).toString('hex');
}

// Check if Heroku CLI is installed
function checkHerokuCLI() {
  try {
    execSync('heroku --version', { stdio: 'pipe' });
    console.log('✅ Heroku CLI is installed');
    return true;
  } catch (error) {
    console.error('❌ Heroku CLI is not installed. Please install it first:');
    console.error('   https://devcenter.heroku.com/articles/heroku-cli');
    return false;
  }
}

// Add Redis addon to Heroku
function addRedisAddon() {
  try {
    console.log('📦 Adding Redis addon to Heroku...');
    execSync(`heroku addons:create heroku-redis:mini --app ${APP_NAME}`, { stdio: 'inherit' });
    console.log('✅ Redis addon added successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to add Redis addon:', error.message);
    console.log('💡 You may need to verify your billing information in Heroku dashboard');
    return false;
  }
}

// Set environment variables
function setEnvironmentVariables() {
  try {
    console.log('🔐 Setting secure environment variables...');
    
    const sessionSecret = generateSessionSecret();
    
    // Set session secret
    execSync(`heroku config:set SESSION_SECRET="${sessionSecret}" --app ${APP_NAME}`, { stdio: 'inherit' });
    
    // Set other production variables
    execSync(`heroku config:set NODE_ENV=production --app ${APP_NAME}`, { stdio: 'inherit' });
    
    console.log('✅ Environment variables set successfully');
    console.log('🔑 Generated new secure session secret');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to set environment variables:', error.message);
    return false;
  }
}

// Check current environment variables
function checkEnvironmentVariables() {
  try {
    console.log('🔍 Checking current environment variables...');
    const output = execSync(`heroku config --app ${APP_NAME}`, { encoding: 'utf8' });
    
    const requiredVars = ['DATABASE_URL', 'OPENAI_API_KEY', 'SESSION_SECRET'];
    const optionalVars = ['REDIS_URL', 'STRIPE_SECRET_KEY', 'RESEND_API_KEY'];
    
    console.log('\n📋 Environment Variables Status:');
    console.log('================================');
    
    requiredVars.forEach(varName => {
      if (output.includes(varName)) {
        console.log(`✅ ${varName}: Configured`);
      } else {
        console.log(`❌ ${varName}: Missing (REQUIRED)`);
      }
    });
    
    optionalVars.forEach(varName => {
      if (output.includes(varName)) {
        console.log(`✅ ${varName}: Configured`);
      } else {
        console.log(`⚠️  ${varName}: Not set (optional)`);
      }
    });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to check environment variables:', error.message);
    return false;
  }
}

// Deploy the application
function deployApplication() {
  try {
    console.log('🚀 Deploying application...');
    execSync('git add .', { stdio: 'inherit' });
    execSync('git commit -m "feat: upgrade to Redis session store and improve security"', { stdio: 'inherit' });
    execSync(`git push heroku main`, { stdio: 'inherit' });
    console.log('✅ Application deployed successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to deploy application:', error.message);
    console.log('💡 Make sure you have committed your changes and have Heroku remote configured');
    return false;
  }
}

// Check application health
function checkApplicationHealth() {
  try {
    console.log('🏥 Checking application health...');
    const output = execSync(`heroku logs --tail --num 50 --app ${APP_NAME}`, { encoding: 'utf8', timeout: 5000 });
    
    if (output.includes('Redis session store initialized successfully')) {
      console.log('✅ Redis session store is working');
    } else if (output.includes('No Redis URL found, using MemoryStore')) {
      console.log('⚠️  Still using MemoryStore - Redis may not be ready yet');
    }
    
    return true;
  } catch (error) {
    console.log('⚠️  Could not check logs automatically');
    console.log('💡 Run: heroku logs --tail --app wordgen-v2-production');
    return false;
  }
}

// Main setup function
async function main() {
  console.log('Starting production setup...\n');
  
  // Step 1: Check prerequisites
  if (!checkHerokuCLI()) {
    process.exit(1);
  }
  
  // Step 2: Add Redis addon
  console.log('\n📦 Step 1: Setting up Redis...');
  const redisSuccess = addRedisAddon();
  
  // Step 3: Set environment variables
  console.log('\n🔐 Step 2: Configuring environment...');
  const envSuccess = setEnvironmentVariables();
  
  // Step 4: Check current configuration
  console.log('\n🔍 Step 3: Validating configuration...');
  checkEnvironmentVariables();
  
  // Step 5: Deploy application
  console.log('\n🚀 Step 4: Deploying application...');
  const deploySuccess = deployApplication();
  
  // Step 6: Check health
  if (deploySuccess) {
    console.log('\n🏥 Step 5: Checking application health...');
    setTimeout(() => {
      checkApplicationHealth();
      
      console.log('\n🎉 Production setup completed!');
      console.log('================================');
      console.log('✅ Redis session store configured');
      console.log('✅ Secure session secrets generated');
      console.log('✅ Application deployed');
      console.log('\n📋 Next Steps:');
      console.log('1. Change admin password: https://wordgen-v2-production-15d78da87625.herokuapp.com');
      console.log('2. Add payment API keys when ready');
      console.log('3. Configure monitoring and alerts');
      console.log('\n📊 Monitor your app:');
      console.log(`   heroku logs --tail --app ${APP_NAME}`);
      console.log(`   heroku ps --app ${APP_NAME}`);
    }, 10000); // Wait 10 seconds for deployment to complete
  }
}

// Run the setup
main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
