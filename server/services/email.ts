import { Resend } from 'resend';
import { db } from '@db';
import { sql } from 'drizzle-orm';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY environment variable is not set');
}

const resend = new Resend(process.env.RESEND_API_KEY);

type EmailTemplate = 'test' | 'welcome' | 'password_reset' | 'team_invitation' | 'article_completion';

interface EmailOptions {
  to: string;
  userId?: number;
  subject?: string;
  metadata?: Record<string, any>;
}

interface TemplateData {
  [key: string]: any;
}

const templates = {
  test: (data: TemplateData) => ({
    subject: 'Test Email',
    html: `
      <h1>Test Email</h1>
      <p>${data.message}</p>
    `,
  }),
  welcome: (data: TemplateData) => ({
    subject: 'Welcome to Our Platform',
    html: `
      <h1>Welcome to Our Platform!</h1>
      <p>Hi ${data.name || 'there'},</p>
      <p>Thank you for joining our platform. We're excited to have you on board!</p>
      <p>Here are some things you can do to get started:</p>
      <ul>
        <li>Create your first project</li>
        <li>Research keywords</li>
        <li>Generate SEO-optimized content</li>
      </ul>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    `,
  }),
  password_reset: (data: TemplateData) => ({
    subject: 'Reset Your Password',
    html: `
      <h1>Reset Your Password</h1>
      <p>Click the link below to reset your password:</p>
      <p><a href="${data.resetLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p>${data.resetLink}</p>
      <p>This link will expire in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
  }),
  team_invitation: (data: TemplateData) => ({
    subject: `You're invited to join ${data.teamName}`,
    html: `
      <h1>Team Invitation</h1>
      <p>You've been invited to join ${data.teamName} by ${data.inviterName}.</p>
      <p><a href="${data.acceptLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Accept Invitation</a></p>
      <p>Or copy and paste this link into your browser:</p>
      <p>${data.acceptLink}</p>
      <p>If you don't want to join, you can ignore this email.</p>
    `,
  }),
  article_completion: (data: TemplateData) => ({
    subject: 'Your Article Generation is Complete',
    html: `
      <h1>Article Generation Complete</h1>
      <p>Your article "${data.articleTitle}" has been generated successfully.</p>
      <p><a href="${data.viewLink}" style="padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">View Article</a></p>
    `,
  }),
};

export async function sendEmail(
  template: EmailTemplate,
  templateData: TemplateData,
  options: EmailOptions
) {
  const { to, userId, metadata = {} } = options;
  const { subject, html } = templates[template](templateData);

  try {
    // Send email using Resend's sandbox domain for development
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to,
      subject: options.subject || subject,
      html,
    });

    // Log successful email using SQL directly to avoid schema issues
    await db.execute(sql`
      INSERT INTO email_logs 
      (recipient_email, subject, body, status, metadata)
      VALUES (
        ${to}, 
        ${options.subject || subject}, 
        ${html}, 
        ${'sent'}, 
        ${JSON.stringify({ ...metadata, templateData, userId, type: template })}
      )
    `);

  } catch (error: any) {
    console.error('Failed to send email:', error);

    // Log failed email using SQL directly to avoid schema issues
    await db.execute(sql`
      INSERT INTO email_logs 
      (recipient_email, subject, body, status, error, metadata)
      VALUES (
        ${to}, 
        ${options.subject || subject}, 
        ${html}, 
        ${'failed'}, 
        ${error.message}, 
        ${JSON.stringify({ ...metadata, templateData, userId, type: template })}
      )
    `);

    throw error;
  }
}

// Helper function to check if an email was sent successfully
export async function wasEmailSent(userId: number, type: EmailTemplate, recipient: string) {
  // Query using SQL directly to avoid schema issues
  const result = await db.execute(sql`
    SELECT metadata FROM email_logs 
    WHERE recipient_email = ${recipient} AND status = ${'sent'}
    ORDER BY created_at DESC LIMIT 1
  `);
  
  const rows = result as unknown as { metadata: string }[];
  
  if (rows.length > 0) {
    try {
      const metadata = JSON.parse(rows[0].metadata);
      return metadata?.userId === userId && metadata?.type === type;
    } catch (error) {
      console.error('Failed to parse email metadata:', error);
    }
  }
  
  return false;
}

export async function sendTeamInvitationEmail(data: {
  email: string;
  teamId: number;
  invitationId: number;
}) {
  const acceptUrl = `${process.env.APP_URL}/teams/invite/${data.invitationId}`;
  
  const html = `
    <h1>Team Invitation</h1>
    <p>You've been invited to join a team on WordGen.</p>
    <p>Click the link below to accept the invitation:</p>
    <a href="${acceptUrl}">Accept Invitation</a>
  `;

  return resend.emails.send({
    from: 'WordGen <invites@wordgen.com>',
    to: data.email,
    subject: 'You\'ve been invited to join a team on WordGen',
    html,
  });
}