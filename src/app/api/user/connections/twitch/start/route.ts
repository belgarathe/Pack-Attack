// app/api/user/connections/twitch/start/route.ts
//
// Initiates the "Connect Twitch to existing account" OAuth flow.
//
// Flow:
//   1. User (already logged in) clicks "Connect Twitch"
//   2. Browser hits GET /api/user/connections/twitch/start
//   3. This route sets a short-lived httpOnly cookie `twitch_link_uid` = userId
//   4. Redirects to /api/auth/signin/twitch (NextAuth's Twitch OAuth entry point)
//   5. After Twitch approves, NextAuth calls the signIn() callback in auth.ts
//   6. signIn() reads the cookie, links the Account, clears the cookie,
//      and returns '/dashboard?tab=connections&success=twitch_connected'
//      → no new session is created, existing JWT is preserved

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
        where: { userId: session.user.id, provider: 'twitch' },
    });
    if (existing) {
        return NextResponse.redirect(
            new URL(
                '/dashboard?tab=connections&error=already_connected',
                process.env.NEXTAUTH_URL!
            )
        );
    }

    // callbackUrl after Twitch OAuth succeeds
    const callbackUrl = `${process.env.NEXTAUTH_URL}/dashboard?tab=connections`;

    const response = NextResponse.redirect(
        new URL(
            `/api/auth/signin/twitch?callbackUrl=${encodeURIComponent(callbackUrl)}`,
            process.env.NEXTAUTH_URL!
        )
    );

    // Set cookie so the signIn callback can identify this as a "link" intent.
    // httpOnly + sameSite=lax + 10 minutes
    response.cookies.set('twitch_link_uid', session.user.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 10, // 10 minutes
        secure: process.env.NODE_ENV === 'production',
    });

    return response;
}