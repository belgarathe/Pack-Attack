import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST() {
  try {
    const session = await getCurrentSession();
    
    // Only admins can create test bots
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const botCount = 8; // Create 8 bot users
    const hashedPassword = await bcrypt.hash('bot_password_not_used', 10);
    const createdBots = [];
    const existingBots = [];
    
    for (let i = 1; i <= botCount; i++) {
      const botEmail = `bot${i}@packattack.local`;
      
      // Check if bot already exists
      const existingBot = await prisma.user.findUnique({
        where: { email: botEmail },
      });

      if (existingBot) {
        existingBots.push(botEmail);
        continue;
      }

      // Create bot user
      const bot = await prisma.user.create({
        data: {
          email: botEmail,
          name: `Bot Player ${i}`,
          passwordHash: hashedPassword,
          isBot: true,
          coins: 10000, // Give bots some coins for testing
          role: 'USER',
        },
      });

      createdBots.push(bot.email);
    }

    // Get total bot count
    const totalBots = await prisma.user.count({
      where: { isBot: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Bot creation complete',
      createdBots,
      existingBots,
      totalBots,
    });
    
  } catch (error) {
    console.error('Error creating test bots:', error);
    return NextResponse.json({ error: 'Failed to create test bots' }, { status: 500 });
  }
}
