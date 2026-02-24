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
  const packOpenings = parseInt(process.argv[3] || '10000');
  
  const box = await prisma.box.findFirst({
    where: { name: { contains: boxName, mode: 'insensitive' } },
    include: { cards: true }
  });

  if (!box) {
    console.log('Box not found: ' + boxName);
    const boxes = await prisma.box.findMany({ select: { name: true, id: true } });
    console.log('Available boxes:');
    boxes.forEach(b => console.log('  - ' + b.name + ' (id: ' + b.id + ')'));
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

  const boxPrice = Number(box.price);
  const cardsPerPack = box.cardsPerPack;
  const totalCardsPulled = packOpenings * cardsPerPack;
  const totalSpent = packOpenings * boxPrice;

  console.log('\n' + '═'.repeat(80));
  console.log('  PACK OPENING SIMULATION - ' + box.name);
  console.log('═'.repeat(80));
  console.log('Box Price:        ' + boxPrice.toFixed(2) + ' coins per pack');
  console.log('Cards Per Pack:   ' + cardsPerPack);
  console.log('Unique Cards:     ' + cards.length);
  console.log('Pack Openings:    ' + packOpenings.toLocaleString());
  console.log('Total Cards Pull: ' + totalCardsPulled.toLocaleString());
  console.log('Total Spent:      ' + totalSpent.toLocaleString() + ' coins');

  const totalPullRate = cards.reduce((sum, c) => sum + c.pullRate, 0);
  const pullCounts: Record<string, number> = {};
  cards.forEach(c => pullCounts[c.id] = 0);

  // Track per-pack data for detailed analysis
  const packValues: number[] = [];     // Total coin value per pack
  const packProfits: number[] = [];    // Profit/loss per pack
  let winningPacks = 0;
  let losingPacks = 0;
  let breakEvenPacks = 0;
  let bestPackValue = -Infinity;
  let worstPackValue = Infinity;
  let totalCoinsWon = 0;

  // Distribution buckets for pack outcomes
  const profitBuckets: Record<string, number> = {};

  console.log('\nRunning ' + packOpenings.toLocaleString() + ' pack simulations...');
  
  for (let i = 0; i < packOpenings; i++) {
    let packValue = 0;
    for (let j = 0; j < cardsPerPack; j++) {
      const pulled = drawCard(cards);
      pullCounts[pulled.id]++;
      packValue += pulled.coinValue;
    }
    
    const packProfit = packValue - boxPrice;
    packValues.push(packValue);
    packProfits.push(packProfit);
    totalCoinsWon += packValue;
    
    if (packProfit > 0) winningPacks++;
    else if (packProfit < 0) losingPacks++;
    else breakEvenPacks++;
    
    if (packValue > bestPackValue) bestPackValue = packValue;
    if (packValue < worstPackValue) worstPackValue = packValue;
  }

  console.log('Done!\n');

  // ─────────────────────────────────────────────────────────────
  // DETAILED CARD RESULTS
  // ─────────────────────────────────────────────────────────────
  console.log('═'.repeat(140));
  console.log('  DETAILED CARD PULL RESULTS');
  console.log('═'.repeat(140));
  console.log(
    'Card Name'.padEnd(40) + 
    'Rarity'.padEnd(18) + 
    'Pull Rate'.padEnd(12) +
    'Expected%'.padEnd(12) + 
    'Actual%'.padEnd(12) + 
    'Deviation'.padEnd(14) + 
    'Times Pulled'.padEnd(14) + 
    'CoinValue'.padEnd(12) + 
    'Total Coins'
  );
  console.log('─'.repeat(140));

  const results = cards.map(card => {
    const expected = (card.pullRate / totalPullRate) * 100;
    const actual = (pullCounts[card.id] / totalCardsPulled) * 100;
    return {
      id: card.id,
      name: card.name,
      rarity: card.rarity,
      pullRateRaw: card.pullRate,
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
    const marker = Math.abs(r.deviation) < 0.5 ? '✓' : Math.abs(r.deviation) < 1 ? '~' : '⚠';
    console.log(
      r.name.substring(0, 39).padEnd(40) +
      r.rarity.substring(0, 17).padEnd(18) +
      r.pullRateRaw.toFixed(3).padStart(8) + '    ' +
      r.expected.toFixed(2).padStart(8) + '%   ' +
      r.actual.toFixed(2).padStart(8) + '%   ' +
      (dev + ' ' + marker).padEnd(14) +
      String(r.pulls).padStart(10) + '    ' +
      r.coinValue.toFixed(2).padStart(8) + '    ' +
      r.totalCoins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    );
  });

  console.log('─'.repeat(140));
  console.log(
    'TOTALS'.padEnd(40) +
    ''.padEnd(18) +
    totalPullRate.toFixed(3).padStart(8) + '    ' +
    '100.00'.padStart(8) + '%   ' +
    '100.00'.padStart(8) + '%   ' +
    ''.padEnd(14) +
    String(totalCardsPulled).padStart(10) + '    ' +
    ''.padStart(8) + '    ' +
    totalCoinsWon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  );

  // ─────────────────────────────────────────────────────────────
  // RARITY BREAKDOWN
  // ─────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(100));
  console.log('  RARITY BREAKDOWN');
  console.log('═'.repeat(100));
  console.log(
    'Rarity'.padEnd(22) + 
    '# Cards'.padEnd(10) + 
    'Expected%'.padEnd(12) + 
    'Actual%'.padEnd(12) + 
    'Times Pulled'.padEnd(14) + 
    'Total Coins'.padEnd(16) + 
    'Avg Value/Pull'
  );
  console.log('─'.repeat(100));
  
  const rarityGroups = new Map<string, { 
    expected: number; actual: number; pulls: number; totalCoins: number; cardCount: number 
  }>();
  results.forEach(r => {
    if (!rarityGroups.has(r.rarity)) {
      rarityGroups.set(r.rarity, { expected: 0, actual: 0, pulls: 0, totalCoins: 0, cardCount: 0 });
    }
    const g = rarityGroups.get(r.rarity)!;
    g.expected += r.expected;
    g.actual += r.actual;
    g.pulls += r.pulls;
    g.totalCoins += r.totalCoins;
    g.cardCount++;
  });

  Array.from(rarityGroups.entries())
    .sort((a, b) => a[1].expected - b[1].expected)
    .forEach(([rarity, data]) => {
      const avgPerPull = data.pulls > 0 ? data.totalCoins / data.pulls : 0;
      console.log(
        rarity.padEnd(22) +
        String(data.cardCount).padEnd(10) +
        (data.expected.toFixed(2) + '%').padEnd(12) +
        (data.actual.toFixed(2) + '%').padEnd(12) +
        String(data.pulls).padStart(10) + '    ' +
        data.totalCoins.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(12) + '    ' +
        avgPerPull.toFixed(2)
      );
    });

  // ─────────────────────────────────────────────────────────────
  // ECONOMICS: PROFIT / LOSS ANALYSIS
  // ─────────────────────────────────────────────────────────────
  const avgPackValue = totalCoinsWon / packOpenings;
  const avgPackProfit = avgPackValue - boxPrice;
  const totalProfit = totalCoinsWon - totalSpent;
  const ROI = ((totalCoinsWon / totalSpent) - 1) * 100;

  // Theoretical expected value per pack
  const theoreticalEVPerCard = cards.reduce((s, c) => s + (c.pullRate / totalPullRate) * c.coinValue, 0);
  const theoreticalEVPerPack = theoreticalEVPerCard * cardsPerPack;
  const theoreticalPackProfit = theoreticalEVPerPack - boxPrice;
  const theoreticalROI = ((theoreticalEVPerPack / boxPrice) - 1) * 100;

  // Standard deviation of pack profits
  const packProfitVariance = packProfits.reduce((s, v) => s + Math.pow(v - avgPackProfit, 2), 0) / packOpenings;
  const packProfitStdDev = Math.sqrt(packProfitVariance);
  
  // Sorted pack values for percentiles
  const sortedPV = [...packValues].sort((a, b) => a - b);
  const percentile = (p: number) => sortedPV[Math.floor(p / 100 * packOpenings)];
  const medianPackValue = sortedPV[Math.floor(packOpenings / 2)];

  console.log('\n' + '═'.repeat(80));
  console.log('  ECONOMICS: PROFIT / LOSS ANALYSIS');
  console.log('═'.repeat(80));
  
  console.log('\n--- Theoretical (Mathematical) ---');
  console.log('Expected Value per Card:    ' + theoreticalEVPerCard.toFixed(2) + ' coins');
  console.log('Expected Value per Pack:    ' + theoreticalEVPerPack.toFixed(2) + ' coins  (' + cardsPerPack + ' cards x ' + theoreticalEVPerCard.toFixed(2) + ')');
  console.log('Pack Cost:                  ' + boxPrice.toFixed(2) + ' coins');
  console.log('Theoretical Profit/Pack:    ' + (theoreticalPackProfit >= 0 ? '+' : '') + theoreticalPackProfit.toFixed(2) + ' coins');
  console.log('Theoretical ROI:            ' + (theoreticalROI >= 0 ? '+' : '') + theoreticalROI.toFixed(2) + '%');
  console.log('House Edge:                 ' + (theoreticalROI >= 0 ? 'PLAYER ADVANTAGE ' + theoreticalROI.toFixed(2) + '%' : 'HOUSE EDGE ' + Math.abs(theoreticalROI).toFixed(2) + '%'));

  console.log('\n--- Actual Simulation Results (' + packOpenings.toLocaleString() + ' packs) ---');
  console.log('Total Coins Spent:          ' + totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' coins');
  console.log('Total Coins Won:            ' + totalCoinsWon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' coins');
  console.log('Net Profit/Loss:            ' + (totalProfit >= 0 ? '+' : '') + totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' coins');
  console.log('ROI:                        ' + (ROI >= 0 ? '+' : '') + ROI.toFixed(2) + '%');
  console.log('');
  console.log('Avg Pack Value:             ' + avgPackValue.toFixed(2) + ' coins');
  console.log('Median Pack Value:          ' + medianPackValue.toFixed(2) + ' coins');
  console.log('Avg Profit/Loss per Pack:   ' + (avgPackProfit >= 0 ? '+' : '') + avgPackProfit.toFixed(2) + ' coins');
  console.log('Std Dev (per pack):         ' + packProfitStdDev.toFixed(2) + ' coins');
  console.log('');
  console.log('Best Pack:                  ' + bestPackValue.toFixed(2) + ' coins (profit: +' + (bestPackValue - boxPrice).toFixed(2) + ')');
  console.log('Worst Pack:                 ' + worstPackValue.toFixed(2) + ' coins (profit: ' + (worstPackValue - boxPrice).toFixed(2) + ')');

  console.log('\n--- Win / Loss Breakdown ---');
  console.log('Winning Packs (profit>0):   ' + winningPacks.toLocaleString() + ' (' + (winningPacks / packOpenings * 100).toFixed(2) + '%)');
  console.log('Losing Packs (profit<0):    ' + losingPacks.toLocaleString() + ' (' + (losingPacks / packOpenings * 100).toFixed(2) + '%)');
  console.log('Break-Even Packs:           ' + breakEvenPacks.toLocaleString() + ' (' + (breakEvenPacks / packOpenings * 100).toFixed(2) + '%)');

  console.log('\n--- Pack Value Distribution ---');
  console.log('10th Percentile:            ' + percentile(10).toFixed(2) + ' coins');
  console.log('25th Percentile:            ' + percentile(25).toFixed(2) + ' coins');
  console.log('50th Percentile (Median):   ' + medianPackValue.toFixed(2) + ' coins');
  console.log('75th Percentile:            ' + percentile(75).toFixed(2) + ' coins');
  console.log('90th Percentile:            ' + percentile(90).toFixed(2) + ' coins');
  console.log('95th Percentile:            ' + percentile(95).toFixed(2) + ' coins');
  console.log('99th Percentile:            ' + percentile(99).toFixed(2) + ' coins');

  // ─────────────────────────────────────────────────────────────
  // TOP HITS - Lucky Packs
  // ─────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(80));
  console.log('  PULL RATE ACCURACY');
  console.log('═'.repeat(80));
  const avgDev = totalDev / cards.length;
  const maxDeviation = Math.max(...results.map(r => Math.abs(r.deviation)));
  console.log('Total Individual Card Draws:  ' + totalCardsPulled.toLocaleString());
  console.log('Average Absolute Deviation:   ' + avgDev.toFixed(3) + '%');
  console.log('Maximum Deviation:            ' + maxDeviation.toFixed(3) + '%');
  
  if (avgDev < 0.5) {
    console.log('Verdict:                      EXCELLENT - Pull rates match expected values');
  } else if (avgDev < 1.0) {
    console.log('Verdict:                      GOOD - Pull rates within acceptable variance');
  } else if (avgDev < 2.0) {
    console.log('Verdict:                      FAIR - Some variance detected');
  } else {
    console.log('Verdict:                      WARNING - Significant deviation detected');
  }

  // ─────────────────────────────────────────────────────────────
  // CASH SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(80));
  console.log('  FINAL CASH SUMMARY');
  console.log('═'.repeat(80));
  const separator = totalProfit >= 0 ? '  >>>  NET GAIN' : '  >>>  NET LOSS';
  console.log('');
  console.log('  Packs Opened:     ' + packOpenings.toLocaleString());
  console.log('  Cost per Pack:    ' + boxPrice.toFixed(2) + ' coins');
  console.log('  Cards per Pack:   ' + cardsPerPack);
  console.log('');
  console.log('  Total Invested:   ' + totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' coins');
  console.log('  Total Returns:    ' + totalCoinsWon.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' coins');
  console.log('  ─────────────────────────────────────────────');
  console.log('  ' + (totalProfit >= 0 ? 'PROFIT' : 'LOSS') + ':           ' + (totalProfit >= 0 ? '+' : '') + totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' coins' + separator);
  console.log('  ROI:              ' + (ROI >= 0 ? '+' : '') + ROI.toFixed(2) + '%');
  console.log('');
  console.log('═'.repeat(80));
  console.log('Legend: ✓ = <0.5% dev, ~ = 0.5-1% dev, ⚠ = >1% dev');
  console.log('═'.repeat(80));

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
});
