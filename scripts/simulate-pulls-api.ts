/**
 * Pull Rate Simulation - Standalone Version
 * 
 * This script fetches box data from the Pack Attack API
 * and simulates card pulls to verify randomization.
 * 
 * Usage: npx tsx scripts/simulate-pulls-api.ts
 */

interface Card {
  id: string;
  name: string;
  pullRate: number;
  coinValue: number;
  rarity: string;
}

interface Box {
  id: string;
  name: string;
  price: number;
  cards: Card[];
}

// The same drawCard function used in production
function drawCard(cards: Card[]): Card {
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

// Box name to search for (can be changed)
const TARGET_BOX = 'One Piece Treasures';
const ITERATIONS = 10000;

async function fetchBoxData(): Promise<Box | null> {
  try {
    // Fetch from production API
    const response = await fetch('https://packattack.de/api/boxes');
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const boxes = await response.json();
    
    // Find the target box
    const targetBox = boxes.find((b: Box) => 
      b.name.toLowerCase().includes(TARGET_BOX.toLowerCase())
    );
    
    if (!targetBox) {
      console.log('Available boxes:', boxes.map((b: Box) => b.name));
      return null;
    }
    
    return targetBox;
  } catch (error) {
    console.error('Failed to fetch box data:', error);
    return null;
  }
}

async function runSimulation(iterations: number) {
  console.log('\n🎴 PULL RATE SIMULATION TEST');
  console.log('═'.repeat(60));
  
  console.log('\n📡 Fetching box data from API...');
  
  const box = await fetchBoxData();
  
  if (!box || !box.cards || box.cards.length === 0) {
    console.error('❌ Could not fetch box data or box has no cards');
    console.log('\n💡 The API might not return full card data for non-logged-in users.');
    return;
  }

  await runSimulationWithBox(box, iterations);
}

async function runSimulationWithBox(box: Box, iterations: number) {
  console.log(`\n📦 Box: ${box.name}`);
  console.log(`💰 Box Price: ${box.price} coins`);
  console.log(`📊 Cards in box: ${box.cards.length}`);
  
  const cards = box.cards.map(card => ({
    id: card.id,
    name: card.name,
    pullRate: Number(card.pullRate),
    coinValue: Number(card.coinValue),
    rarity: card.rarity || 'Unknown',
  }));

  await runSimulationWithCards(cards, iterations, box.price);
}

async function runSimulationWithCards(cards: Card[], iterations: number, boxPrice: number = 0) {
  console.log(`🔄 Simulations: ${iterations.toLocaleString()}`);
  
  const totalPullRate = cards.reduce((sum, c) => sum + c.pullRate, 0);
  
  console.log(`\n📈 Total Pull Rate Sum: ${totalPullRate.toFixed(4)}`);
  console.log('\n' + '─'.repeat(60));

  // Track pull counts and coin values
  const pullCounts: Record<string, number> = {};
  cards.forEach(c => pullCounts[c.id] = 0);
  
  const allPullValues: number[] = [];

  // Run simulation
  console.log('\n⏳ Running simulation...');
  const startTime = Date.now();
  
  for (let i = 0; i < iterations; i++) {
    const pulledCard = drawCard(cards);
    pullCounts[pulledCard.id]++;
    allPullValues.push(pulledCard.coinValue);
    
    // Progress indicator
    if ((i + 1) % (iterations / 10) === 0) {
      process.stdout.write(`  ${Math.round(((i + 1) / iterations) * 100)}%`);
    }
  }
  
  const duration = Date.now() - startTime;
  console.log(`\n\n✅ Completed in ${duration}ms\n`);

  // Calculate and display results
  console.log('═'.repeat(120));
  console.log('DETAILED CARD RESULTS');
  console.log('═'.repeat(120));
  console.log('');
  console.log(
    'Card Name'.padEnd(35) +
    'Rarity'.padEnd(15) +
    'Expected %'.padEnd(12) +
    'Actual %'.padEnd(12) +
    'Deviation'.padEnd(14) +
    'Pulls'.padEnd(10) +
    'Coin Value'.padEnd(12) +
    'Total Coins'
  );
  console.log('─'.repeat(120));

  let totalDeviation = 0;
  const results: Array<{
    name: string;
    rarity: string;
    expected: number;
    actual: number;
    deviation: number;
    pulls: number;
    coinValue: number;
    totalCoins: number;
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
      totalCoins: pullCounts[card.id] * card.coinValue,
    });
  });

  // Sort by coin value (highest first)
  results.sort((a, b) => b.coinValue - a.coinValue);

  results.forEach(r => {
    const deviationStr = r.deviation >= 0 ? `+${r.deviation.toFixed(2)}%` : `${r.deviation.toFixed(2)}%`;
    const deviationColor = Math.abs(r.deviation) < 1 ? '✓' : Math.abs(r.deviation) < 2 ? '~' : '⚠';
    
    console.log(
      r.name.substring(0, 34).padEnd(35) +
      r.rarity.substring(0, 14).padEnd(15) +
      `${r.expected.toFixed(2)}%`.padEnd(12) +
      `${r.actual.toFixed(2)}%`.padEnd(12) +
      `${deviationStr} ${deviationColor}`.padEnd(14) +
      r.pulls.toString().padEnd(10) +
      r.coinValue.toString().padEnd(12) +
      r.totalCoins.toLocaleString()
    );
  });

  console.log('─'.repeat(120));
  
  // Calculate coin statistics
  const totalCoinsWon = allPullValues.reduce((sum, v) => sum + v, 0);
  const avgCoinValue = totalCoinsWon / iterations;
  
  // Sort for median calculation
  const sortedValues = [...allPullValues].sort((a, b) => a - b);
  const medianCoinValue = iterations % 2 === 0
    ? (sortedValues[iterations / 2 - 1] + sortedValues[iterations / 2]) / 2
    : sortedValues[Math.floor(iterations / 2)];
  
  // Calculate mode (most common value)
  const valueFrequency: Record<number, number> = {};
  allPullValues.forEach(v => {
    valueFrequency[v] = (valueFrequency[v] || 0) + 1;
  });
  const modeValue = Object.entries(valueFrequency)
    .sort((a, b) => b[1] - a[1])[0];
  
  // Min and Max
  const minValue = Math.min(...allPullValues);
  const maxValue = Math.max(...allPullValues);
  
  // Standard deviation
  const variance = allPullValues.reduce((sum, v) => sum + Math.pow(v - avgCoinValue, 2), 0) / iterations;
  const stdDev = Math.sqrt(variance);
  
  // Expected value calculation (theoretical)
  const theoreticalExpectedValue = cards.reduce((sum, card) => {
    const probability = card.pullRate / totalPullRate;
    return sum + (probability * card.coinValue);
  }, 0);
  
  // Summary statistics
  const avgDeviation = totalDeviation / cards.length;
  const maxDeviation = Math.max(...results.map(r => Math.abs(r.deviation)));
  
  console.log('\n' + '═'.repeat(60));
  console.log('💰 COIN VALUE STATISTICS');
  console.log('═'.repeat(60));
  console.log(`Total Coins Won:            ${totalCoinsWon.toLocaleString()} coins`);
  console.log(`Average Coin Value/Pull:    ${avgCoinValue.toFixed(2)} coins`);
  console.log(`Median Coin Value/Pull:     ${medianCoinValue.toFixed(2)} coins`);
  console.log(`Mode (Most Common) Value:   ${modeValue[0]} coins (${modeValue[1]} times)`);
  console.log(`Min Value Pulled:           ${minValue} coins`);
  console.log(`Max Value Pulled:           ${maxValue} coins`);
  console.log(`Standard Deviation:         ${stdDev.toFixed(2)} coins`);
  console.log('─'.repeat(60));
  console.log(`Theoretical Expected Value: ${theoreticalExpectedValue.toFixed(2)} coins`);
  console.log(`Actual Average Value:       ${avgCoinValue.toFixed(2)} coins`);
  console.log(`Difference:                 ${(avgCoinValue - theoreticalExpectedValue).toFixed(2)} coins (${((avgCoinValue / theoreticalExpectedValue - 1) * 100).toFixed(2)}%)`);
  
  if (boxPrice > 0) {
    console.log('─'.repeat(60));
    console.log(`Box Price:                  ${boxPrice} coins`);
    console.log(`Expected Return/Pull:       ${((theoreticalExpectedValue / boxPrice) * 100).toFixed(2)}%`);
    console.log(`Actual Return/Pull:         ${((avgCoinValue / boxPrice) * 100).toFixed(2)}%`);
    const profitLoss = avgCoinValue - boxPrice;
    const profitLossStr = profitLoss >= 0 ? `+${profitLoss.toFixed(2)}` : profitLoss.toFixed(2);
    console.log(`Avg Profit/Loss per Pull:   ${profitLossStr} coins`);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('📊 PULL RATE STATISTICS');
  console.log('═'.repeat(60));
  console.log(`Average Absolute Deviation: ${avgDeviation.toFixed(3)}%`);
  console.log(`Maximum Deviation:          ${maxDeviation.toFixed(3)}%`);
  console.log(`Total Pulls:                ${iterations.toLocaleString()}`);
  
  // Statistical analysis
  console.log('\n🎯 RANDOMIZER ANALYSIS');
  console.log('─'.repeat(60));
  
  if (avgDeviation < 0.5) {
    console.log('✅ EXCELLENT: Pull rates are very accurately matching expected values.');
    console.log('   The randomizer is working correctly.');
  } else if (avgDeviation < 1.0) {
    console.log('✅ GOOD: Pull rates are within acceptable variance.');
    console.log('   The randomizer is functioning properly.');
  } else if (avgDeviation < 2.0) {
    console.log('⚠️  FAIR: Some variance detected, but within statistical norms.');
    console.log('   This is normal for this sample size.');
  } else {
    console.log('❌ WARNING: Significant deviation detected. May need investigation.');
  }

  // Rarity breakdown
  console.log('\n📦 RARITY BREAKDOWN');
  console.log('─'.repeat(60));
  
  const rarityGroups = new Map<string, { expected: number; actual: number; count: number; totalCoins: number; pulls: number }>();
  
  results.forEach(r => {
    if (!rarityGroups.has(r.rarity)) {
      rarityGroups.set(r.rarity, { expected: 0, actual: 0, count: 0, totalCoins: 0, pulls: 0 });
    }
    const group = rarityGroups.get(r.rarity)!;
    group.expected += r.expected;
    group.actual += r.actual;
    group.count++;
    group.totalCoins += r.totalCoins;
    group.pulls += r.pulls;
  });

  console.log('Rarity'.padEnd(20) + 'Expected %'.padEnd(12) + 'Actual %'.padEnd(12) + 'Pulls'.padEnd(10) + 'Total Coins');
  console.log('─'.repeat(60));
  
  // Sort by expected rate (rarest first)
  const sortedRarities = Array.from(rarityGroups.entries())
    .sort((a, b) => a[1].expected - b[1].expected);
    
  sortedRarities.forEach(([rarity, data]) => {
    console.log(
      rarity.padEnd(20) +
      `${data.expected.toFixed(2)}%`.padEnd(12) +
      `${data.actual.toFixed(2)}%`.padEnd(12) +
      data.pulls.toString().padEnd(10) +
      data.totalCoins.toLocaleString()
    );
  });
  
  console.log('\n' + '═'.repeat(60));
  console.log('Legend: ✓ = <1% deviation, ~ = 1-2% deviation, ⚠ = >2% deviation');
  console.log('═'.repeat(60));
}

// Run
runSimulation(ITERATIONS);
