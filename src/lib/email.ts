import { Resend } from 'resend';
import { prisma } from './prisma';
import { EmailType, EmailStatus } from '@prisma/client';

// Lazy initialize Resend to avoid errors during build
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_NAME = 'Pack Attack';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  error?: string;
}

/**
 * Log an email to the database
 */
async function logEmail(
  toEmail: string,
  subject: string,
  type: EmailType,
  status: EmailStatus,
  userId?: string,
  resendId?: string,
  error?: string
) {
  try {
    await prisma.emailLog.create({
      data: {
        toEmail,
        subject,
        type,
        status,
        userId,
        resendId,
        error,
      },
    });
  } catch (err) {
    console.error('Failed to log email:', err);
  }
}

/**
 * Send a verification email to a user
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  userId?: string
): Promise<SendEmailResult> {
  const verifyUrl = `${APP_URL}/verify-email?token=${token}`;
  const subject = `Verify your ${APP_NAME} account`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: linear-gradient(to bottom, #1e293b, #0f172a); border-radius: 16px; border: 1px solid #334155; overflow: hidden;">
          <div style="padding: 40px 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: bold;">
              <span style="color: #fff;">PACK </span>
              <span style="background: linear-gradient(to right, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ATTACK</span>
            </h1>
          </div>
          <div style="padding: 20px 40px 40px;">
            <h2 style="color: #fff; font-size: 24px; margin: 0 0 16px;">Verify Your Email</h2>
            <p style="color: #94a3b8; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
              Welcome to Pack Attack! Please verify your email address to complete your registration and start opening packs.
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${verifyUrl}" style="display: inline-block; padding: 16px 32px; background: linear-gradient(to right, #3b82f6, #2563eb); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #64748b; font-size: 14px; line-height: 20px; margin: 0;">
              Or copy and paste this link into your browser:<br>
              <a href="${verifyUrl}" style="color: #60a5fa; word-break: break-all;">${verifyUrl}</a>
            </p>
            <p style="color: #64748b; font-size: 14px; margin: 24px 0 0;">
              This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
          <div style="padding: 20px 40px; border-top: 1px solid #334155; text-align: center;">
            <p style="color: #475569; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });

    if (error) {
      await logEmail(email, subject, 'VERIFICATION', 'FAILED', userId, undefined, error.message);
      return { success: false, error: error.message };
    }

    await logEmail(email, subject, 'VERIFICATION', 'SENT', userId, data?.id);
    return { success: true, emailId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await logEmail(email, subject, 'VERIFICATION', 'FAILED', userId, undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a welcome email after verification
 */
export async function sendWelcomeEmail(
  email: string,
  name?: string,
  userId?: string
): Promise<SendEmailResult> {
  const subject = `Welcome to ${APP_NAME}!`;
  const greeting = name ? `Hi ${name}` : 'Welcome';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0f172a; margin: 0; padding: 40px 20px;">
        <div style="max-width: 560px; margin: 0 auto; background: linear-gradient(to bottom, #1e293b, #0f172a); border-radius: 16px; border: 1px solid #334155; overflow: hidden;">
          <div style="padding: 40px 40px 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 32px; font-weight: bold;">
              <span style="color: #fff;">PACK </span>
              <span style="background: linear-gradient(to right, #60a5fa, #a78bfa); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">ATTACK</span>
            </h1>
          </div>
          <div style="padding: 20px 40px 40px;">
            <h2 style="color: #fff; font-size: 24px; margin: 0 0 16px;">${greeting}! 🎉</h2>
            <p style="color: #94a3b8; font-size: 16px; line-height: 24px; margin: 0 0 24px;">
              Your email has been verified and your account is ready to go! You've received <strong style="color: #fbbf24;">1,000 bonus coins</strong> to get started.
            </p>
            <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 12px; padding: 20px; margin: 24px 0;">
              <h3 style="color: #fff; font-size: 16px; margin: 0 0 12px;">What you can do now:</h3>
              <ul style="color: #94a3b8; font-size: 14px; line-height: 24px; margin: 0; padding-left: 20px;">
                <li>Open trading card packs</li>
                <li>Battle other players</li>
                <li>Build your collection</li>
                <li>Win real cards!</li>
              </ul>
            </div>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${APP_URL}/boxes" style="display: inline-block; padding: 16px 32px; background: linear-gradient(to right, #3b82f6, #2563eb); color: #fff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 12px;">
                Start Opening Packs
              </a>
            </div>
          </div>
          <div style="padding: 20px 40px; border-top: 1px solid #334155; text-align: center;">
            <p style="color: #475569; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} ${APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });

    if (error) {
      await logEmail(email, subject, 'WELCOME', 'FAILED', userId, undefined, error.message);
      return { success: false, error: error.message };
    }

    await logEmail(email, subject, 'WELCOME', 'SENT', userId, data?.id);
    return { success: true, emailId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    await logEmail(email, subject, 'WELCOME', 'FAILED', userId, undefined, errorMessage);
    return { success: false, error: errorMessage };
  }
}

/**
 * Send a custom email (for admin use)
 */
export async function sendCustomEmail(
  to: string | string[],
  subject: string,
  html: string,
  userId?: string
): Promise<SendEmailResult> {
  const toArray = Array.isArray(to) ? to : [to];
  
  try {
    const client = getResendClient();
    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: toArray,
      subject,
      html,
    });

    if (error) {
      // Log for each recipient
      for (const email of toArray) {
        await logEmail(email, subject, 'ADMIN_CUSTOM', 'FAILED', userId, undefined, error.message);
      }
      return { success: false, error: error.message };
    }

    // Log for each recipient
    for (const email of toArray) {
      await logEmail(email, subject, 'ADMIN_CUSTOM', 'SENT', userId, data?.id);
    }
    return { success: true, emailId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    for (const email of toArray) {
      await logEmail(email, subject, 'ADMIN_CUSTOM', 'FAILED', userId, undefined, errorMessage);
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Resend verification email to a user
 */
export async function resendVerificationEmail(
  userId: string
): Promise<SendEmailResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (user.emailVerified) {
    return { success: false, error: 'Email already verified' };
  }

  // Generate new token
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.user.update({
    where: { id: userId },
    data: {
      verificationToken: token,
      verificationExpires: expires,
    },
  });

  return sendVerificationEmail(user.email, token, userId);
}

/**
 * Generate a verification token for a user
 */
export function generateVerificationToken(): { token: string; expires: Date } {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, expires };
}

