#!/usr/bin/env node

/**
 * Database Migration Runner for WordGen v2
 * 
 * This script handles database migrations for both development and production environments.
 * It can run individual migrations or set up a complete fresh database.
 * 
 * Usage:
 *   node scripts/migrate-database.js --fresh    # Run complete fresh setup
 *   node scripts/migrate-database.js --migrate  # Run pending migrations only
 *   node scripts/migrate-database.js --rollback # Rollback last migration (if supported)
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database configuration
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
});

// Migration tracking table
const MIGRATIONS_TABLE = 'schema_migrations';

/**
 * Create migrations tracking table if it doesn't exist
 */
async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      checksum TEXT
    );
  `;
  
  await pool.query(query);
  console.log('✓ Migrations tracking table ready');
}

/**
 * Get list of applied migrations
 */
async function getAppliedMigrations() {
  const result = await pool.query(
    `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY applied_at`
  );
  return result.rows.map(row => row.filename);
}

/**
 * Get list of migration files
 */
function getMigrationFiles() {
  const migrationsDir = join(__dirname, '..', 'db', 'migrations');
  return readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

/**
 * Calculate checksum for migration file
 */
async function calculateChecksum(content) {
  const crypto = await import('crypto');
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Run a single migration file
 */
async function runMigration(filename) {
  const migrationsDir = join(__dirname, '..', 'db', 'migrations');
  const filePath = join(migrationsDir, filename);
  const content = readFileSync(filePath, 'utf8');
  const checksum = await calculateChecksum(content);
  
  console.log(`Running migration: ${filename}`);
  
  try {
    // Start transaction
    await pool.query('BEGIN');
    
    // Run the migration
    await pool.query(content);
    
    // Record the migration
    await pool.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (filename, checksum) VALUES ($1, $2)`,
      [filename, checksum]
    );
    
    // Commit transaction
    await pool.query('COMMIT');
    
    console.log(`✓ Migration completed: ${filename}`);
  } catch (error) {
    // Rollback on error
    await pool.query('ROLLBACK');
    console.error(`✗ Migration failed: ${filename}`);
    throw error;
  }
}

/**
 * Run fresh database setup
 */
async function runFreshSetup() {
  console.log('🚀 Running fresh database setup...');

  try {
    // Drop all tables and recreate schema
    console.log('🗑️  Dropping all existing tables...');
    await pool.query('DROP SCHEMA public CASCADE');
    await pool.query('CREATE SCHEMA public');
    await pool.query('GRANT ALL ON SCHEMA public TO postgres');
    await pool.query('GRANT ALL ON SCHEMA public TO public');

    // Create migrations table
    await createMigrationsTable();

    // Run all available migrations in order
    const availableMigrations = getMigrationFiles();
    for (const migration of availableMigrations) {
      await runMigration(migration);
    }
    
    console.log('✅ Fresh database setup completed successfully!');
    console.log('');
    console.log('Default admin user created:');
    console.log('  Email: admin@wordgen.com');
    console.log('  Password: admin123');
    console.log('  ⚠️  CHANGE THIS PASSWORD IMMEDIATELY IN PRODUCTION!');
    
  } catch (error) {
    console.error('❌ Fresh setup failed:', error.message);
    throw error;
  }
}

/**
 * Run pending migrations
 */
async function runPendingMigrations() {
  console.log('🔄 Checking for pending migrations...');
  
  try {
    // Create migrations table if it doesn't exist
    await createMigrationsTable();
    
    // Get applied and available migrations
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = getMigrationFiles();
    
    // Find pending migrations
    const pendingMigrations = availableMigrations.filter(
      migration => !appliedMigrations.includes(migration)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('✓ No pending migrations found');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach(migration => console.log(`  - ${migration}`));
    console.log('');
    
    // Run each pending migration
    for (const migration of pendingMigrations) {
      await runMigration(migration);
    }
    
    console.log('✅ All pending migrations completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

/**
 * Show migration status
 */
async function showStatus() {
  console.log('📊 Migration Status:');
  console.log('');
  
  try {
    await createMigrationsTable();
    
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = getMigrationFiles();
    
    console.log(`Applied migrations: ${appliedMigrations.length}`);
    console.log(`Available migrations: ${availableMigrations.length}`);
    console.log('');
    
    if (appliedMigrations.length > 0) {
      console.log('Applied migrations:');
      appliedMigrations.forEach(migration => console.log(`  ✓ ${migration}`));
      console.log('');
    }
    
    const pendingMigrations = availableMigrations.filter(
      migration => !appliedMigrations.includes(migration)
    );
    
    if (pendingMigrations.length > 0) {
      console.log('Pending migrations:');
      pendingMigrations.forEach(migration => console.log(`  ⏳ ${migration}`));
    } else {
      console.log('✅ All migrations are up to date');
    }
    
  } catch (error) {
    console.error('❌ Failed to get status:', error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case '--fresh':
        await runFreshSetup();
        break;
        
      case '--migrate':
        await runPendingMigrations();
        break;
        
      case '--status':
        await showStatus();
        break;
        
      default:
        console.log('WordGen v2 Database Migration Tool');
        console.log('');
        console.log('Usage:');
        console.log('  node scripts/migrate-database.js --fresh    # Fresh database setup');
        console.log('  node scripts/migrate-database.js --migrate  # Run pending migrations');
        console.log('  node scripts/migrate-database.js --status   # Show migration status');
        console.log('');
        console.log('Environment variables required:');
        console.log('  DATABASE_URL - PostgreSQL connection string');
        break;
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
