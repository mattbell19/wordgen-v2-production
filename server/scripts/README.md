# WordGen Teams Feature Test Scripts

This directory contains test scripts for verifying the WordGen teams feature functionality. These scripts help ensure that all aspects of the teams feature are working correctly.

## Available Scripts

### 1. Email Invitation Testing

**Script:** `test-team-invitation.js`

**Purpose:** Tests the team invitation email functionality by creating a test team if needed, sending a test invitation email, and verifying the email was sent successfully.

**Usage:**
```bash
NODE_ENV=development node server/scripts/test-team-invitation.js
```

### 2. Team Data Access Verification

**Script:** `verify-team-data-access.js`

**Purpose:** Verifies that team members can access shared team data by finding a team with multiple members, checking if members can access team content, and verifying content attribution works correctly.

**Usage:**
```bash
NODE_ENV=development node server/scripts/verify-team-data-access.js
```

### 3. Team Switching Testing

**Script:** `test-team-switching.js`

**Purpose:** Tests the team switching functionality by finding a user with access to at least one team, switching between personal and team contexts, and verifying the activeTeamId is updated correctly.

**Usage:**
```bash
NODE_ENV=development node server/scripts/test-team-switching.js
```

### 4. Team Billing Testing

**Script:** `test-team-billing.js`

**Purpose:** Tests the team billing functionality by finding a team to use for testing, checking if the team has a subscription, and simulating usage tracking for the team.

**Usage:**
```bash
NODE_ENV=development node server/scripts/test-team-billing.js
```

### 5. Team Roles and Permissions Testing

**Script:** `test-team-roles.js`

**Purpose:** Tests the team roles and permissions functionality by finding a team to use for testing, checking existing roles and their permissions, and testing permission enforcement.

**Usage:**
```bash
NODE_ENV=development node server/scripts/test-team-roles.js
```

## Running All Tests

To run all tests in sequence, you can use the following command:

```bash
for script in test-team-invitation.js verify-team-data-access.js test-team-switching.js test-team-billing.js test-team-roles.js; do
  echo "Running $script..."
  NODE_ENV=development node server/scripts/$script
  echo "----------------------------------------"
done
```

## Notes

- These scripts are designed to be run in a development environment.
- Some scripts may modify database records, so use caution when running them in production.
- The scripts will output detailed information about the tests being performed and their results.
- If any issues are found, the scripts will provide information to help diagnose and fix the problems.
