import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Get count of feedback needing admin attention (OPEN or CLAIMED)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const count = await prisma.feedback.count({
      where: {
        status: { in: ['OPEN', 'CLAIMED', 'IN_PROGRESS'] },
      },
    });

    return NextResponse.json({ success: true, count });
  } catch (error) {
    console.error('Failed to fetch pending feedback count:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch count.' }, { status: 500 });
  }
}
