import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { sendVerificationEmail, generateVerificationToken } from '@/lib/email';

const registerSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    
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
