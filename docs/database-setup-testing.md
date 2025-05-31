# Testing Database Setup on Railway

This document provides instructions for testing the database setup script on the Railway production environment.

## Prerequisites

- Access to the Railway project
- PostgreSQL database provisioned on Railway
- Railway CLI installed (optional, but recommended)

## Testing Steps

### 1. Connect to the Railway Shell

There are two ways to connect to the Railway shell:

#### Option 1: Using the Railway Dashboard

1. Log in to [Railway](https://railway.app/)
2. Navigate to your WordGen v2 project
3. Select the service where your application is deployed
4. Click on the "Shell" tab

#### Option 2: Using the Railway CLI

1. Install the Railway CLI if you haven't already:
   ```bash
   npm i -g @railway/cli
   ```

2. Log in to Railway:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Connect to the shell:
   ```bash
   railway shell
   ```

### 2. Run the Database Setup Script

Once you're connected to the Railway shell, run the database setup script:

```bash
npm run db:setup
```

This will execute the setup script that creates all the necessary tables in your PostgreSQL database.

### 3. Verify the Database Tables

After running the setup script, verify that all the required tables have been created:

```bash
# Connect to the PostgreSQL database
psql $DATABASE_URL

# List all tables
\dt

# Check the structure of specific tables
\d users
\d articles
\d keyword_lists
\d saved_keywords
\d user_usage
```

You should see all the tables defined in the `db-setup.sql` file, including:
- users
- projects
- articles
- keywords
- keyword_lists
- saved_keywords
- user_usage
- subscriptions
- subscription_plans

### 4. Test Basic Database Operations

Test some basic database operations to ensure the tables are working correctly:

```sql
-- Check if users table exists and has the correct structure
SELECT * FROM users LIMIT 5;

-- Check if articles table exists and has the correct structure
SELECT * FROM articles LIMIT 5;

-- Check if keyword_lists table exists and has the correct structure
SELECT * FROM keyword_lists LIMIT 5;

-- Check if saved_keywords table exists and has the correct structure
SELECT * FROM saved_keywords LIMIT 5;
```

### 5. Test the Sync Usage Endpoint

After verifying the database tables, test the sync usage endpoint to ensure it correctly updates the usage statistics:

1. Make sure your application is running on Railway
2. Log in to the application
3. Navigate to the dashboard
4. Check the browser console for any errors related to the sync usage endpoint
5. Verify that the dashboard shows the correct number of articles, words, etc.

### 6. Troubleshooting

If you encounter any issues during the testing process:

#### Database Connection Issues

- Verify that the `DATABASE_URL` environment variable is correctly set in Railway
- Check if the database is running and accessible
- Ensure your IP is allowed to connect to the database (if using IP restrictions)

#### Table Creation Issues

- Check the logs for any SQL errors during table creation
- Verify that the SQL script is compatible with the PostgreSQL version on Railway
- Try running the SQL commands manually to identify specific issues

#### Sync Usage Issues

- Check the server logs for any errors related to the sync usage endpoint
- Verify that the database tables have the correct structure
- Test the endpoint manually using a tool like Postman or curl

## Conclusion

After completing these steps, you should have verified that:

1. The database setup script works correctly on the production environment
2. All required tables are created with the correct structure
3. The sync usage endpoint correctly updates the usage statistics

If all tests pass, you can proceed with the next steps in the improvement plan.
