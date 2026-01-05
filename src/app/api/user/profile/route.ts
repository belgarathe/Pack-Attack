import { NextResponse } from 'next/server';
import { getCurrentSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  shippingName: z.string().max(100).optional(),
  shippingAddress: z.string().max(200).optional(),
  shippingCity: z.string().max(100).optional(),
  shippingZip: z.string().max(20).optional(),
  shippingCountry: z.string().max(100).optional(),
  shippingPhone: z.string().max(30).optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        avatar: true,
        coins: true,
        emailVerified: true,
        shippingName: true,
        shippingAddress: true,
        shippingCity: true,
        shippingZip: true,
        shippingCountry: true,
        shippingPhone: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getCurrentSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    const user = await prisma.user.update({
      where: { email: session.user.email },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        bio: true,
        avatar: true,
        coins: true,
        emailVerified: true,
        shippingName: true,
        shippingAddress: true,
        shippingCity: true,
        shippingZip: true,
        shippingCountry: true,
        shippingPhone: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ user, message: 'Profile updated successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}


