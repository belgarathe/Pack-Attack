import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getRandomCard(cards: any[]) {
  // Calculate total pull rate
  const totalPullRate = cards.reduce((sum, card) => {
    return sum + Number(card.pullRate);
  }, 0);

  // Generate random number
  const random = Math.random() * totalPullRate;

  // Select card based on pull rates
  let accumulator = 0;
  for (const card of cards) {
    accumulator += Number(card.pullRate);
    if (random <= accumulator) {
      return card;
    }
  }

  // Fallback to last card
  return cards[cards.length - 1];
}

async function runSimulation() {
  console.log('🎴 Pull Rate Simulation Test\n');
  console.log('='.repeat(60));
  
  // Find the One Piece box
  const box = await prisma.box.findFirst({
    where: { 
      name: { contains: 'One Piece', mode: 'insensitive' } 
    },
    include: {
      cards: {
        orderBy: { pullRate: 'desc' },
      }
    }
  });
  
  if (!box) {
    console.log('❌ One Piece box not found!');
    
    // List available boxes
    const boxes = await prisma.box.findMany({
      select: { id: true, name: true }
    });
    console.log('\nAvailable boxes:');
    boxes.forEach(b => console.log(`  - ${b.name}`));
    return;
  }
  
  console.log(`\n📦 Box: ${box.name}`);
  console.log(`📊 Total Cards: ${box.cards.length}`);
  
  const totalRate = box.cards.reduce((sum, c) => sum + Number(c.pullRate), 0);
  console.log(`📈 Total Pull Rate: ${totalRate.toFixed(3)}%\n`);
  
  console.log('Expected Pull Rates:');
  console.log('-'.repeat(60));
  box.cards.forEach(card => {
    const rate = Number(card.pullRate);
    console.log(`  ${card.name.padEnd(35)} ${rate.toFixed(3).padStart(7)}% | ${card.coinValue} coins`);
  });
  
  // Run simulation
  const DRAWS = 10000;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎲 Running ${DRAWS.toLocaleString()} simulated draws...\n`);
  
  const pullCounts: Map<string, number> = new Map();
  const coinTotals: Map<string, number> = new Map();
  
  // Initialize counters
  box.cards.forEach(card => {
    pullCounts.set(card.id, 0);
    coinTotals.set(card.id, 0);
  });
  
  // Run the simulation
  for (let i = 0; i < DRAWS; i++) {
    const card = await getRandomCard(box.cards);
    pullCounts.set(card.id, (pullCounts.get(card.id) || 0) + 1);
    coinTotals.set(card.id, (coinTotals.get(card.id) || 0) + card.coinValue);
  }
  
  // Calculate and display results
  console.log('Simulation Results:');
  console.log('-'.repeat(80));
  console.log(`${'Card Name'.padEnd(35)} ${'Expected'.padStart(10)} ${'Actual'.padStart(10)} ${'Diff'.padStart(8)} ${'Pulls'.padStart(8)}`);
  console.log('-'.repeat(80));
  
  let totalCoinsWon = 0;
  let maxDeviation = 0;
  
  box.cards.forEach(card => {
    const expectedRate = Number(card.pullRate);
    const actualPulls = pullCounts.get(card.id) || 0;
    const actualRate = (actualPulls / DRAWS) * 100;
    const deviation = actualRate - expectedRate;
    const deviationPct = expectedRate > 0 ? ((deviation / expectedRate) * 100) : 0;
    
    totalCoinsWon += coinTotals.get(card.id) || 0;
    maxDeviation = Math.max(maxDeviation, Math.abs(deviationPct));
    
    const deviationStr = deviation >= 0 ? `+${deviation.toFixed(2)}%` : `${deviation.toFixed(2)}%`;
    const status = Math.abs(deviationPct) < 20 ? '✅' : Math.abs(deviationPct) < 50 ? '⚠️' : '❌';
    
    console.log(
      `${status} ${card.name.padEnd(33)} ${expectedRate.toFixed(3).padStart(9)}% ${actualRate.toFixed(3).padStart(9)}% ${deviationStr.padStart(8)} ${actualPulls.toString().padStart(7)}`
    );
  });
  
  console.log('-'.repeat(80));
  
  // Summary statistics
  const avgCoinsPerDraw = totalCoinsWon / DRAWS;
  
  console.log(`\n📊 Summary Statistics:`);
  console.log(`   Total Draws: ${DRAWS.toLocaleString()}`);
  console.log(`   Total Coins Won: ${totalCoinsWon.toLocaleString()}`);
  console.log(`   Average Coins/Draw: ${avgCoinsPerDraw.toFixed(2)}`);
  console.log(`   Max Deviation: ${maxDeviation.toFixed(2)}%`);
  
  // Chi-square test approximation
  let chiSquare = 0;
  box.cards.forEach(card => {
    const expectedPulls = (Number(card.pullRate) / 100) * DRAWS;
    const actualPulls = pullCounts.get(card.id) || 0;
    if (expectedPulls > 0) {
      chiSquare += Math.pow(actualPulls - expectedPulls, 2) / expectedPulls;
    }
  });
  
  const degreesOfFreedom = box.cards.length - 1;
  // Critical value for 95% confidence with df degrees of freedom (approximate)
  const criticalValue = degreesOfFreedom + 2 * Math.sqrt(2 * degreesOfFreedom);
  
  console.log(`\n🔬 Statistical Analysis:`);
  console.log(`   Chi-Square Value: ${chiSquare.toFixed(2)}`);
  console.log(`   Degrees of Freedom: ${degreesOfFreedom}`);
  console.log(`   Critical Value (α=0.05): ~${criticalValue.toFixed(2)}`);
  
  if (chiSquare < criticalValue) {
    console.log(`   Result: ✅ PASS - Distribution matches expected rates`);
  } else {
    console.log(`   Result: ⚠️ DEVIATION - Distribution differs from expected`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Simulation complete!');
}

runSimulation()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

