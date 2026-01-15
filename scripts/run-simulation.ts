import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Card {
  id: string;
  name: string;
  pullRate: number;
  coinValue: number;
  rarity: string;
}

function drawCard(cards: Card[]): Card {
  const total = cards.reduce((sum, card) => sum + card.pullRate, 0);
  const random = Math.random() * total;
  let cumulative = 0;
  for (const card of cards) {
    cumulative += card.pullRate;
    if (random <= cumulative) return card;
  }
  return cards[cards.length - 1];
}

async function main() {
  const boxName = process.argv[2] || 'One Piece Treasures';
  const iterations = parseInt(process.argv[3] || '10000');
  
  const box = await prisma.box.findFirst({
    where: { name: { contains: boxName, mode: 'insensitive' } },
    include: { cards: true }
  });

  if (!box) {
    console.log('Box not found: ' + boxName);
    const boxes = await prisma.box.findMany({ select: { name: true } });
    console.log('Available boxes:', boxes.map(b => b.name));
    await prisma.$disconnect();
    return;
  }

  const cards: Card[] = box.cards.map(c => ({
    id: c.id,
    name: c.name,
    pullRate: Number(c.pullRate),
    coinValue: Number(c.coinValue),
    rarity: c.rarity || 'Unknown'
  }));

  console.log('\n🎴 PULL RATE SIMULATION - ' + box.name);
  console.log('═'.repeat(60));
  console.log('Box Price: ' + box.price + ' coins');
  console.log('Cards: ' + cards.length);
  console.log('Iterations: ' + iterations.toLocaleString());

  const totalPullRate = cards.reduce((sum, c) => sum + c.pullRate, 0);
  const pullCounts: Record<string, number> = {};
  cards.forEach(c => pullCounts[c.id] = 0);
  const allPullValues: number[] = [];

  console.log('\nRunning simulation...');
  for (let i = 0; i < iterations; i++) {
    const pulled = drawCard(cards);
    pullCounts[pulled.id]++;
    allPullValues.push(pulled.coinValue);
  }
  console.log('Done!\n');

  console.log('═'.repeat(130));
  console.log('DETAILED CARD RESULTS');
  console.log('═'.repeat(130));
  console.log(
    'Card Name'.padEnd(45) + 
    'Rarity'.padEnd(18) + 
    'Expected%'.padEnd(12) + 
    'Actual%'.padEnd(12) + 
    'Deviation'.padEnd(14) + 
    'Pulls'.padEnd(10) + 
    'CoinVal'.padEnd(12) + 
    'TotalCoins'
  );
  console.log('─'.repeat(130));

  const results = cards.map(card => {
    const expected = (card.pullRate / totalPullRate) * 100;
    const actual = (pullCounts[card.id] / iterations) * 100;
    return {
      name: card.name,
      rarity: card.rarity,
      expected,
      actual,
      deviation: actual - expected,
      pulls: pullCounts[card.id],
      coinValue: card.coinValue,
      totalCoins: pullCounts[card.id] * card.coinValue
    };
  }).sort((a, b) => b.coinValue - a.coinValue);

  let totalDev = 0;
  results.forEach(r => {
    totalDev += Math.abs(r.deviation);
    const dev = r.deviation >= 0 ? '+' + r.deviation.toFixed(2) + '%' : r.deviation.toFixed(2) + '%';
    const marker = Math.abs(r.deviation) < 1 ? '✓' : Math.abs(r.deviation) < 2 ? '~' : '⚠';
    console.log(
      r.name.substring(0, 44).padEnd(45) +
      r.rarity.substring(0, 17).padEnd(18) +
      r.expected.toFixed(2).padStart(8) + '%   ' +
      r.actual.toFixed(2).padStart(8) + '%   ' +
      (dev + ' ' + marker).padEnd(14) +
      String(r.pulls).padEnd(10) +
      String(r.coinValue).padEnd(12) +
      r.totalCoins.toLocaleString()
    );
  });

  console.log('─'.repeat(130));

  // Coin statistics
  const totalCoins = allPullValues.reduce((s, v) => s + v, 0);
  const avg = totalCoins / iterations;
  const sorted = [...allPullValues].sort((a, b) => a - b);
  const median = sorted[Math.floor(iterations / 2)];
  const minVal = Math.min(...allPullValues);
  const maxVal = Math.max(...allPullValues);
  
  // Theoretical expected value
  const theoretical = cards.reduce((s, c) => s + (c.pullRate / totalPullRate) * c.coinValue, 0);
  
  // Standard deviation
  const variance = allPullValues.reduce((s, v) => s + Math.pow(v - avg, 2), 0) / iterations;
  const stdDev = Math.sqrt(variance);
  
  // Value frequency for mode
  const valueFreq: Record<number, number> = {};
  allPullValues.forEach(v => valueFreq[v] = (valueFreq[v] || 0) + 1);
  const modeEntry = Object.entries(valueFreq).sort((a, b) => b[1] - a[1])[0];

  console.log('\n' + '═'.repeat(60));
  console.log('💰 COIN VALUE STATISTICS');
  console.log('═'.repeat(60));
  console.log('Total Coins Won:            ' + totalCoins.toLocaleString() + ' coins');
  console.log('Average Coin Value/Pull:    ' + avg.toFixed(2) + ' coins');
  console.log('Median Coin Value/Pull:     ' + median + ' coins');
  console.log('Mode (Most Common):         ' + modeEntry[0] + ' coins (' + modeEntry[1] + ' times)');
  console.log('Min Value Pulled:           ' + minVal + ' coins');
  console.log('Max Value Pulled:           ' + maxVal + ' coins');
  console.log('Standard Deviation:         ' + stdDev.toFixed(2) + ' coins');
  console.log('─'.repeat(60));
  console.log('Theoretical Expected Value: ' + theoretical.toFixed(2) + ' coins');
  console.log('Actual Average Value:       ' + avg.toFixed(2) + ' coins');
  const diff = avg - theoretical;
  console.log('Difference:                 ' + (diff >= 0 ? '+' : '') + diff.toFixed(2) + ' coins (' + ((avg / theoretical - 1) * 100).toFixed(2) + '%)');
  
  console.log('─'.repeat(60));
  console.log('Box Price:                  ' + box.price + ' coins');
  console.log('Expected Return/Pull:       ' + ((theoretical / box.price) * 100).toFixed(2) + '%');
  console.log('Actual Return/Pull:         ' + ((avg / box.price) * 100).toFixed(2) + '%');
  const profitLoss = avg - box.price;
  console.log('Avg Profit/Loss per Pull:   ' + (profitLoss >= 0 ? '+' : '') + profitLoss.toFixed(2) + ' coins');

  // Pull rate analysis
  const avgDev = totalDev / cards.length;
  const maxDev = Math.max(...results.map(r => Math.abs(r.deviation)));

  console.log('\n' + '═'.repeat(60));
  console.log('📊 PULL RATE STATISTICS');
  console.log('═'.repeat(60));
  console.log('Average Absolute Deviation: ' + avgDev.toFixed(3) + '%');
  console.log('Maximum Deviation:          ' + maxDev.toFixed(3) + '%');
  console.log('Total Pulls:                ' + iterations.toLocaleString());

  console.log('\n🎯 RANDOMIZER ANALYSIS');
  console.log('─'.repeat(60));
  if (avgDev < 0.5) {
    console.log('✅ EXCELLENT: Pull rates very accurately match expected values.');
  } else if (avgDev < 1.0) {
    console.log('✅ GOOD: Pull rates are within acceptable variance.');
  } else if (avgDev < 2.0) {
    console.log('⚠️  FAIR: Some variance detected, within statistical norms.');
  } else {
    console.log('❌ WARNING: Significant deviation detected.');
  }

  // Rarity breakdown
  console.log('\n📦 RARITY BREAKDOWN');
  console.log('─'.repeat(70));
  console.log('Rarity'.padEnd(20) + 'Expected%'.padEnd(12) + 'Actual%'.padEnd(12) + 'Pulls'.padEnd(10) + 'Total Coins');
  console.log('─'.repeat(70));
  
  const rarityGroups = new Map<string, { expected: number; actual: number; pulls: number; totalCoins: number }>();
  results.forEach(r => {
    if (!rarityGroups.has(r.rarity)) {
      rarityGroups.set(r.rarity, { expected: 0, actual: 0, pulls: 0, totalCoins: 0 });
    }
    const g = rarityGroups.get(r.rarity)!;
    g.expected += r.expected;
    g.actual += r.actual;
    g.pulls += r.pulls;
    g.totalCoins += r.totalCoins;
  });

  Array.from(rarityGroups.entries())
    .sort((a, b) => a[1].expected - b[1].expected)
    .forEach(([rarity, data]) => {
      console.log(
        rarity.padEnd(20) +
        (data.expected.toFixed(2) + '%').padEnd(12) +
        (data.actual.toFixed(2) + '%').padEnd(12) +
        String(data.pulls).padEnd(10) +
        data.totalCoins.toLocaleString()
      );
    });

  console.log('\n' + '═'.repeat(60));
  console.log('Legend: ✓ = <1% deviation, ~ = 1-2% deviation, ⚠ = >2% deviation');
  console.log('═'.repeat(60));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
