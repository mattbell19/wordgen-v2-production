# Resend Email Integration Documentation

## Overview
This document outlines how Resend.com is integrated into our application for handling transactional emails and audience management. Resend provides reliable email delivery and audience management capabilities for our application's communication needs.

## Configuration
- Environment Variables:
  - `RESEND_API_KEY`: Required for authentication with Resend's API
  - `APP_URL`: Used for generating proper links in emails (defaults to http://localhost:5000)

## Features

### 1. Email Templates
Located in `server/services/email.ts`, we support the following email types:
- Welcome emails (`welcome`)
- Password reset emails (`password_reset`)
- Team invitations (`team_invitation`)
- Article completion notifications (`article_completion`)
- Test emails (`test`)

### 2. Contact Management
Located in `server/services/resend.ts`, providing:
- Adding contacts to Resend audience
- Retrieving contact information
- Updating contact preferences
- Default audience ID for registered users: `979de85d-57ca-4d19-ba40-ed71ea87c9df`

### 3. Email Logging
All emails are logged in the database with:
- Email type
- Recipient
- Status (sent/failed)
- Associated user ID
- Metadata for tracking

## Usage Examples

### Sending Password Reset Email
```typescript
await sendEmail(
  'password_reset',
  {
    resetLink: `${process.env.APP_URL}/reset-password?token=${token}`,
  },
  {
    to: userEmail,
    userId: user.id,
    metadata: {
      requestedAt: new Date().toISOString(),
    },
  }
);
```

### Team Invitation Email
```typescript
await sendEmail(
  'team_invitation',
  {
    teamName: team.name,
    inviterName: inviter.name,
    acceptLink: `${process.env.APP_URL}/teams/${teamId}/accept-invitation`,
  },
  {
    to: invitedUserEmail,
    userId: invitedUserId,
    metadata: {
      teamId,
      invitationId,
    },
  }
);
```

### Managing Contacts
```typescript
// Add a new contact
await addResendContact(user.email, user.id);

// Update contact preferences
await updateResendContact(user.email, { unsubscribed: true });

// Get contact details
const contact = await getResendContact(user.email);
```

## Best Practices

1. Email Templates
   - Keep templates simple and responsive
   - Include both HTML and plain text versions
   - Use consistent branding and styling
   - Include unsubscribe links where appropriate

2. Error Handling
   - Always log failed email attempts
   - Implement retry logic for failed sends
   - Keep error messages user-friendly
   - Monitor email delivery rates

3. Contact Management
   - Sync user preferences with Resend audience
   - Respect unsubscribe requests promptly
   - Keep audience lists clean and updated
   - Use tags for better segmentation

4. Security
   - Never expose the Resend API key
   - Validate email addresses before sending
   - Use secure links in emails
   - Implement rate limiting for email sends

## Monitoring and Maintenance

1. Email Logs
   - Regular review of failed emails
   - Monitor delivery rates and bounces
   - Track email engagement metrics
   - Clean up old log entries periodically

2. Contact Lists
   - Regular sync with user database
   - Remove inactive contacts
   - Update contact information as needed
   - Monitor audience growth and engagement

## Troubleshooting

Common issues and solutions:
1. Emails not sending
   - Check RESEND_API_KEY is properly set
   - Verify email format is correct
   - Check for rate limiting issues
   - Review error logs for specific failures

2. Contact sync issues
   - Verify audience ID is correct
   - Check for duplicate contacts
   - Review API response errors
   - Ensure proper error handling

## Future Improvements

Planned enhancements:
1. Email template customization interface
2. Advanced audience segmentation
3. A/B testing capabilities
4. Enhanced email analytics
5. Automated email campaign management
