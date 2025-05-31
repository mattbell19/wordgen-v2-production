/**
 * Environment Variable Validator
 * 
 * Validates required and optional environment variables for production
 */

interface EnvConfig {
  required: string[];
  optional: string[];
  production: string[];
}

const envConfig: EnvConfig = {
  required: [
    'DATABASE_URL',
    'NODE_ENV'
  ],
  optional: [
    'REDIS_URL',
    'REDIS_TLS_URL',
    'SESSION_SECRET',
    'JWT_SECRET',
    'OPENAI_API_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY',
    'RESEND_API_KEY',
    'ANTHROPIC_API_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DATAFORSEO_LOGIN',
    'DATAFORSEO_PASSWORD',
    'POSTHOG_KEY',
    'POSTHOG_HOST'
  ],
  production: [
    'SESSION_SECRET',
    'OPENAI_API_KEY'
  ]
};

interface ValidationResult {
  isValid: boolean;
  missing: string[];
  warnings: string[];
  configured: string[];
}

export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    isValid: true,
    missing: [],
    warnings: [],
    configured: []
  };

  const isProduction = process.env.NODE_ENV === 'production';

  // Check required variables
  envConfig.required.forEach(varName => {
    if (!process.env[varName]) {
      result.missing.push(varName);
      result.isValid = false;
    } else {
      result.configured.push(varName);
    }
  });

  // Check production-specific requirements
  if (isProduction) {
    envConfig.production.forEach(varName => {
      if (!process.env[varName]) {
        result.missing.push(varName);
        result.isValid = false;
      } else if (!result.configured.includes(varName)) {
        result.configured.push(varName);
      }
    });

    // Check for default/insecure values
    if (process.env.SESSION_SECRET === 'development-secret') {
      result.warnings.push('SESSION_SECRET is using default value - this is insecure!');
    }
  }

  // Check optional but recommended variables
  envConfig.optional.forEach(varName => {
    if (process.env[varName]) {
      if (!result.configured.includes(varName)) {
        result.configured.push(varName);
      }
    } else {
      result.warnings.push(`${varName} is not configured (optional)`);
    }
  });

  return result;
}

export function logEnvironmentStatus(): void {
  const result = validateEnvironment();
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('\n🔍 Environment Configuration Status');
  console.log('===================================');

  if (result.configured.length > 0) {
    console.log('\n✅ Configured Variables:');
    result.configured.forEach(varName => {
      // Don't log sensitive values
      const isSensitive = varName.includes('SECRET') || varName.includes('KEY') || varName.includes('PASSWORD');
      const value = isSensitive ? '[HIDDEN]' : process.env[varName];
      console.log(`   ${varName}: ${value}`);
    });
  }

  if (result.missing.length > 0) {
    console.log('\n❌ Missing Required Variables:');
    result.missing.forEach(varName => {
      console.log(`   ${varName}`);
    });
  }

  if (result.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    result.warnings.forEach(warning => {
      console.log(`   ${warning}`);
    });
  }

  if (isProduction && !result.isValid) {
    console.log('\n🚨 PRODUCTION ENVIRONMENT IS NOT PROPERLY CONFIGURED!');
    console.log('   Please set all required environment variables before deploying.');
  } else if (result.isValid) {
    console.log('\n✅ Environment configuration is valid');
  }

  console.log('===================================\n');
}

export function getEnvironmentSummary(): string {
  const result = validateEnvironment();
  const isProduction = process.env.NODE_ENV === 'production';
  
  return `Environment: ${process.env.NODE_ENV || 'development'} | ` +
         `Configured: ${result.configured.length} | ` +
         `Missing: ${result.missing.length} | ` +
         `Valid: ${result.isValid ? 'Yes' : 'No'}`;
}

// Auto-validate on import in production
if (process.env.NODE_ENV === 'production') {
  const result = validateEnvironment();
  if (!result.isValid) {
    console.error('❌ Environment validation failed in production!');
    console.error('Missing variables:', result.missing);
    // Don't exit in production, just warn
  }
}
