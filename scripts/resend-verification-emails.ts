/**
 * Script to resend verification emails to all unverified users
 * Run with: npx tsx scripts/resend-verification-emails.ts
 */

import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';

const prisma = new PrismaClient();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const APP_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const APP_NAME = 'Pack Attack';

if (!RESEND_API_KEY) {
  console.error('❌ RESEND_API_KEY is not set in environment variables');
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

async function generateVerificationToken(): Promise<{ token: string; expires: Date }> {
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return { token, expires };
}

async function sendVerificationEmail(email: string, token: string): Promise<boolean> {
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
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject,
      html,
    });

    if (error) {
      console.error(`  ❌ Failed to send to ${email}: ${error.message}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error(`  ❌ Error sending to ${email}:`, err);
    return false;
  }
}

async function main() {
  console.log('🔍 Finding unverified users...\n');

  // Find all users who haven't verified their email
  const unverifiedUsers = await prisma.user.findMany({
    where: {
      emailVerified: false,
      isBot: false,
    },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
    },
  });

  if (unverifiedUsers.length === 0) {
    console.log('✅ No unverified users found. All users have verified their emails!');
    return;
  }

  console.log(`📧 Found ${unverifiedUsers.length} unverified user(s):\n`);

  let successCount = 0;
  let failCount = 0;

  for (const user of unverifiedUsers) {
    console.log(`Processing: ${user.email} (${user.name || 'No name'})`);

    // Generate new verification token
    const { token, expires } = await generateVerificationToken();

    // Update user with new token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: token,
        verificationExpires: expires,
      },
    });

    // Send verification email
    const success = await sendVerificationEmail(user.email, token);

    if (success) {
      console.log(`  ✅ Verification email sent to ${user.email}`);
      successCount++;
    } else {
      failCount++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Summary:');
  console.log(`  ✅ Sent: ${successCount}`);
  console.log(`  ❌ Failed: ${failCount}`);
  console.log(`  📧 Total: ${unverifiedUsers.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
