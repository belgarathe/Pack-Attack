import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { sendVerificationEmail, generateVerificationToken } from '@/lib/email';
import { rateLimit } from '@/lib/rate-limit';

// SECURITY: Strong password validation
const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be less than 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// SECURITY: Bcrypt cost factor (12 is recommended for 2024+)
const BCRYPT_ROUNDS = 12;

export async function POST(request: NextRequest) {
  // Apply rate limiting - 5 attempts per 15 minutes
  const rateLimitResult = await rateLimit(request, 'auth');
  if (!rateLimitResult.success && rateLimitResult.response) {
    return rateLimitResult.response;
  }
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    
    // Generate verification token
    const { token, expires } = generateVerificationToken();

    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: 'USER',
        emailVerified: false,
        verificationToken: token,
        verificationExpires: expires,
        coins: 1000, // Welcome bonus
      },
    });

    // Send verification email
    const emailResult = await sendVerificationEmail(data.email, token, user.id);
    
    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
      // Don't fail registration if email fails - user can request resend
    }

    return NextResponse.json({ 
      success: true, 
      user: { id: user.id, email: user.email },
      message: 'Please check your email to verify your account',
      emailSent: emailResult.success,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 });
  }
}
