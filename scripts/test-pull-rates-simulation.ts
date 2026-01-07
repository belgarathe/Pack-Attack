/**
 * Pull Rate Simulation Test
 * 
 * This script simulates opening a box many times and compares
 * the actual pull rates to the expected pull rates.
 * 
 * Usage: npx tsx scripts/test-pull-rates-simulation.ts [boxName] [iterations]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The same drawCard function used in production
function drawCard(cards: Array<{ id: string; name: string; pullRate: number }>) {
  if (!cards || cards.length === 0) {
    throw new Error('No cards available');
  }

  const total = cards.reduce((sum, card) => sum + card.pullRate, 0);
  if (total === 0) {
    throw new Error('Total pull rate is zero');
  }

  const random = Math.random() * total;
  let cumulative = 0;

  for (const card of cards) {
    cumulative += card.pullRate;
    if (random <= cumulative) {
      return card;
    }
  }

  return cards[cards.length - 1];
}

async function runSimulation(boxNameFilter: string, iterations: number) {
  console.log('\n🎴 PULL RATE SIMULATION TEST');
  console.log('═'.repeat(60));
  
  // Find box by name (partial match)
  const box = await prisma.box.findFirst({
    where: {
      name: {
        contains: boxNameFilter,
        mode: 'insensitive',
      },
    },
    include: {
      cards: {
        orderBy: { pullRate: 'asc' }, // Rarest first
      },
    },
  });

  if (!box) {
    console.error(`❌ No box found matching: "${boxNameFilter}"`);
    const boxes = await prisma.box.findMany({ select: { name: true } });
    console.log('\nAvailable boxes:');
    boxes.forEach(b => console.log(`  - ${b.name}`));
    process.exit(1);
  }

  console.log(`\n📦 Box: ${box.name}`);
  console.log(`📊 Cards in box: ${box.cards.length}`);
  console.log(`🔄 Simulations: ${iterations.toLocaleString()}`);
  
  // Prepare cards for simulation
  const cards = box.cards.map(card => ({
    id: card.id,
    name: card.name,
    pullRate: Number(card.pullRate),
    coinValue: card.coinValue,
    rarity: card.rarity || 'Unknown',
  }));

  const totalPullRate = cards.reduce((sum, c) => sum + c.pullRate, 0);
  
  console.log(`\n📈 Total Pull Rate Sum: ${totalPullRate.toFixed(4)}`);
  console.log('\n' + '─'.repeat(60));

  // Track pull counts
  const pullCounts: Record<string, number> = {};
  cards.forEach(c => pullCounts[c.id] = 0);

  // Run simulation
  console.log('\n⏳ Running simulation...');
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const pulledCard = drawCard(cards);
    pullCounts[pulledCard.id]++;
    
    // Progress indicator
    if ((i + 1) % (iterations / 10) === 0) {
      process.stdout.write(`  ${Math.round(((i + 1) / iterations) * 100)}%`);
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`\n\n✅ Completed in ${duration}ms\n`);

  // Calculate and display results
  console.log('═'.repeat(100));
  console.log('RESULTS');
  console.log('═'.repeat(100));
  console.log('');
  console.log(
    'Card Name'.padEnd(35) +
    'Rarity'.padEnd(12) +
    'Expected %'.padEnd(12) +
    'Actual %'.padEnd(12) +
    'Deviation'.padEnd(12) +
    'Pulls'.padEnd(10) +
    'Coin Value'
  );
  console.log('─'.repeat(100));

  let totalDeviation = 0;
  const results: Array<{
    name: string;
    rarity: string;
    expected: number;
    actual: number;
    deviation: number;
    pulls: number;
    coinValue: number;
  }> = [];

  cards.forEach(card => {
    const expected = (card.pullRate / totalPullRate) * 100;
    const actual = (pullCounts[card.id] / iterations) * 100;
    const deviation = actual - expected;
    totalDeviation += Math.abs(deviation);

    results.push({
      name: card.name,
      rarity: card.rarity,
      expected,
      actual,
      deviation,
      pulls: pullCounts[card.id],
      coinValue: card.coinValue,
    });
  });

  // Sort by expected rate (rarest first)
  results.sort((a, b) => a.expected - b.expected);

  results.forEach(r => {
    const deviationStr = r.deviation >= 0 ? `+${r.deviation.toFixed(2)}%` : `${r.deviation.toFixed(2)}%`;
    const deviationColor = Math.abs(r.deviation) < 1 ? '✓' : Math.abs(r.deviation) < 2 ? '~' : '⚠';
    
    console.log(
      r.name.substring(0, 34).padEnd(35) +
      r.rarity.substring(0, 11).padEnd(12) +
      `${r.expected.toFixed(2)}%`.padEnd(12) +
      `${r.actual.toFixed(2)}%`.padEnd(12) +
      `${deviationStr} ${deviationColor}`.padEnd(12) +
      r.pulls.toString().padEnd(10) +
      r.coinValue.toString()
    );
  });

  console.log('─'.repeat(100));
  
  // Summary statistics
  const avgDeviation = totalDeviation / cards.length;
  const maxDeviation = Math.max(...results.map(r => Math.abs(r.deviation)));
  
  console.log('\n📊 SUMMARY STATISTICS');
  console.log('─'.repeat(40));
  console.log(`Average Absolute Deviation: ${avgDeviation.toFixed(3)}%`);
  console.log(`Maximum Deviation: ${maxDeviation.toFixed(3)}%`);
  console.log(`Total Pulls: ${iterations.toLocaleString()}`);
  
  // Statistical analysis
  console.log('\n🎯 ANALYSIS');
  console.log('─'.repeat(40));
  
  if (avgDeviation < 0.5) {
    console.log('✅ EXCELLENT: Pull rates are very accurately matching expected values.');
  } else if (avgDeviation < 1.0) {
    console.log('✅ GOOD: Pull rates are within acceptable variance.');
  } else if (avgDeviation < 2.0) {
    console.log('⚠️  FAIR: Some variance detected, but within statistical norms for this sample size.');
  } else {
    console.log('❌ WARNING: Significant deviation detected. May need investigation.');
  }

  // Chi-squared test approximation
  let chiSquared = 0;
  results.forEach(r => {
    const expected = (r.expected / 100) * iterations;
    const observed = r.pulls;
    if (expected > 0) {
      chiSquared += Math.pow(observed - expected, 2) / expected;
    }
  });

  const degreesOfFreedom = cards.length - 1;
  console.log(`\nChi-Squared Statistic: ${chiSquared.toFixed(2)} (df=${degreesOfFreedom})`);
  
  // Critical values for common significance levels
  // For df=50: α=0.05 → 67.5, α=0.01 → 76.2
  // For df=10: α=0.05 → 18.3, α=0.01 → 23.2
  // For df=5: α=0.05 → 11.1, α=0.01 → 15.1
  
  console.log('\n═'.repeat(60));
  console.log('Legend: ✓ = <1% deviation, ~ = 1-2% deviation, ⚠ = >2% deviation');
  console.log('═'.repeat(60));
}

async function main() {
  const args = process.argv.slice(2);
  const boxName = args[0] || 'One Piece';
  const iterations = parseInt(args[1]) || 1000;

  try {
    await runSimulation(boxName, iterations);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();







