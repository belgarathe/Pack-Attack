import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createBots() {
  console.log('Starting bot creation...');
  try {
    const botCount = 8; // Create 8 bot users
    const hashedPassword = await bcrypt.hash('bot_password_not_used', 10);
    
    for (let i = 1; i <= botCount; i++) {
      const botEmail = `bot${i}@packattack.local`;
      
      // Check if bot already exists
      const existingBot = await prisma.user.findUnique({
        where: { email: botEmail },
      });

      if (existingBot) {
        console.log(`Bot ${i} already exists: ${botEmail}`);
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

      console.log(`Created bot ${i}: ${bot.email} (${bot.name})`);
    }

    console.log('\n✅ Bot creation complete!');
    
    // Show total bot count
    const totalBots = await prisma.user.count({
      where: { isBot: true },
    });
    console.log(`Total bot users in database: ${totalBots}`);
    
  } catch (error) {
    console.error('Error creating bots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createBots();
