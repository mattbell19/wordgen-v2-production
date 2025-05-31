#!/usr/bin/env node

/**
 * Script to run all database migrations
 * Usage: node scripts/run-migrations.js
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import pg from 'pg';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const { Pool } = pg;

const migrationsDir = path.join(__dirname, '../db/migrations');
const appliedMigrationsTable = 'applied_migrations';

async function main() {
  console.log('Starting database migrations...');
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${appliedMigrationsTable} (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Get list of applied migrations
    const { rows: appliedMigrations } = await pool.query(
      `SELECT name FROM ${appliedMigrationsTable}`
    );
    const appliedMigrationNames = appliedMigrations.map(m => m.name);
    
    // Get list of migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Sort to ensure migrations run in order
    
    // Find migrations that haven't been applied yet
    const pendingMigrations = migrationFiles.filter(
      file => !appliedMigrationNames.includes(file)
    );
    
    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply.');
      return;
    }
    
    console.log(`Found ${pendingMigrations.length} pending migrations to apply.`);
    
    // Apply each pending migration
    for (const migrationFile of pendingMigrations) {
      console.log(`Applying migration: ${migrationFile}`);
      
      const migrationPath = path.join(migrationsDir, migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Start a transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        
        // Apply the migration
        await client.query(migrationSql);
        
        // Record the migration as applied
        await client.query(
          `INSERT INTO ${appliedMigrationsTable} (name) VALUES ($1)`,
          [migrationFile]
        );
        
        await client.query('COMMIT');
        console.log(`Successfully applied migration: ${migrationFile}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Error applying migration ${migrationFile}:`, error);
        throw error;
      } finally {
        client.release();
      }
    }
    
    console.log('All migrations applied successfully.');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
