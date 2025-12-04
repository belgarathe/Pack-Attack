import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBots() {
  try {
    const botCount = await prisma.user.count({
      where: { isBot: true },
    });
    
    console.log(`Total bot users in database: ${botCount}`);
    
    if (botCount > 0) {
      const bots = await prisma.user.findMany({
        where: { isBot: true },
        select: { email: true, name: true },
      });
      
      console.log('Bot users:');
      bots.forEach(bot => {
        console.log(`  - ${bot.name} (${bot.email})`);
      });
    }
  } catch (error) {
    console.error('Error checking bots:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBots();


