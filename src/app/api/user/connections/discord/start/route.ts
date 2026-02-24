import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/login', process.env.NEXTAUTH_URL!));
    }

    // Guard: already connected?
    const existing = await prisma.account.findFirst({
        where: { userId: session.user.id, provider: 'discord' },
    });
    if (existing) {
        return NextResponse.redirect(
            new URL(
                '/dashboard?tab=connections&error=already_connected',
                process.env.NEXTAUTH_URL!
            )
        );
    }

    const callbackUrl = `${process.env.NEXTAUTH_URL}/dashboard?tab=connections`;

    const response = NextResponse.redirect(
        new URL(
            `/api/auth/signin/discord?callbackUrl=${encodeURIComponent(callbackUrl)}`,
            process.env.NEXTAUTH_URL!
        )
    );

    response.cookies.set('discord_link_uid', session.user.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10, // 10 Minuten
        secure: process.env.NODE_ENV === 'production',
    });

    return response;
}