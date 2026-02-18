// app/api/user/connections/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// ── GET /api/user/connections ─────────────────────────────────────────────────
// Returns which OAuth providers are currently linked to the logged-in user.
export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.account.findMany({
        where: { userId: session.user.id },
        select: {
            provider: true,
            providerAccountId: true,
            createdAt: true,
        },
    });

    return NextResponse.json({
        connections: {
            twitch: accounts.find((a) => a.provider === 'twitch') ?? null,
            discord: accounts.find((a) => a.provider === 'discord') ?? null,
        },
    });
}

// ── DELETE /api/user/connections ──────────────────────────────────────────────
// Unlinks an OAuth provider from the logged-in user.
// Body: { provider: 'twitch' | 'discord' }
export async function DELETE(request: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { provider } = body as { provider?: string };

    if (!provider || !['twitch', 'discord'].includes(provider)) {
        return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // Safety check: the user must have at least one remaining login method
    // (password OR another OAuth account) before we allow removal.
    const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: { accounts: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const hasPassword = !!user.passwordHash;
    const remainingAccounts = user.accounts.filter((a) => a.provider !== provider);

    if (!hasPassword && remainingAccounts.length === 0) {
        return NextResponse.json(
            {
                error:
                    'Du kannst deinen letzten Login-Weg nicht entfernen. Setze zuerst ein Passwort.',
            },
            { status: 400 }
        );
    }

    await prisma.account.deleteMany({
        where: { userId: session.user.id, provider },
    });

    // If disconnecting Twitch, clear the cached username on the user row
    if (provider === 'twitch') {
        await prisma.user.update({
            where: { id: session.user.id },
            data: { twitchUsername: null },
        });
    }

    return NextResponse.json({ success: true, provider });
}