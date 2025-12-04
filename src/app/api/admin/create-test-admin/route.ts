import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcrypt';

export async function POST() {
  try {
    const email = 'admin@packattack.com';
    const password = 'admin123';
    const name = 'Admin User';

    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingUser) {
      // Update existing user to admin
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: 'ADMIN',
          name,
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Admin user updated successfully',
        credentials: {
          email,
          password,
        },
      });
    } else {
      // Create new admin user
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'ADMIN',
          coins: 10000,
        },
      });
      return NextResponse.json({
        success: true,
        message: 'Admin user created successfully',
        credentials: {
          email,
          password,
        },
        userId: user.id,
      });
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create admin user' },
      { status: 500 }
    );
  }
}

