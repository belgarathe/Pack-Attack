import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.account.findFirst({
        where: { userId: session.user.id, provider: 'twitch' },
        select: { id: true },
    });

    if (existing) {
        return NextResponse.json({ error: 'already_connected' }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set('twitch_link_uid', session.user.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10, // 10 Minuten
        secure: process.env.NODE_ENV === 'production',
    });

    return response;
}