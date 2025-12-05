// Simple script to add 10 more cards to the One Piece box
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const boxId = 'cmiqp6ewk003gugi0srqngjom'; // One Piece box ID
  
  // Create 10 additional test cards
  const newCards = [];
  for (let i = 5; i <= 14; i++) {
    newCards.push({
      scryfallId: `one-piece-card-${i}-${Date.now()}`,
      name: `One Piece Card ${i}`,
      setName: 'One Piece TCG',
      setCode: 'OP01',
      collectorNumber: String(100 + i),
      rarity: i <= 8 ? 'common' : i <= 11 ? 'uncommon' : 'rare',
      imageUrlGatherer: `https://optcgapi.com/media/static/Card_Images/OP01-0${String(i + 20).padStart(2, '0')}.jpg`,
      colors: ['R'],
      type: 'Character',
      boxId: boxId,
      coinValue: 50 + (i * 10),
      pullRate: 5.0
    });
  }
  
  try {
    const result = await prisma.card.createMany({
      data: newCards
    });
    console.log(`✅ Added ${result.count} cards to One Piece box!`);
    
    const box = await prisma.box.findUnique({
      where: { id: boxId },
      include: { cards: true }
    });
    
    console.log(`📦 One Piece box now has ${box.cards.length} total cards!`);
    console.log(`🎮 Test at: http://localhost:3000/open/${boxId}`);
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

