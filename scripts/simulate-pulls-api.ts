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

async function fetchBoxData(): Promise<Box | null> {
  try {
    // Fetch from production API
    const response = await fetch('https://pack-attack.de/api/boxes');
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    const boxes = await response.json();
    
    // Find One Piece box
    const onePieceBox = boxes.find((b: Box) => 
      b.name.toLowerCase().includes('one piece')
    );
    
    if (!onePieceBox) {
      console.log('Available boxes:', boxes.map((b: Box) => b.name));
      return null;
    }
    
    return onePieceBox;
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
    console.log('   Let me use sample data from the One Piece Treasures box instead.\n');
    
    // Use hardcoded test data if API doesn't return cards
    await runWithSampleData(iterations);
    return;
  }

  await runSimulationWithBox(box, iterations);
}

async function runWithSampleData(iterations: number) {
  // This represents typical One Piece card distribution
  // with various pull rates from common to rare
  const sampleCards: Card[] = [
    // Ultra Rare / Secret Rare (very low pull rate)
    { id: '1', name: 'Monkey D. Luffy (Gear 5)', pullRate: 0.5, coinValue: 5500, rarity: 'Secret Rare' },
    { id: '2', name: 'Shanks (Alternate Art)', pullRate: 0.8, coinValue: 4200, rarity: 'Secret Rare' },
    
    // Super Rare
    { id: '3', name: 'Trafalgar Law', pullRate: 1.5, coinValue: 2800, rarity: 'Super Rare' },
    { id: '4', name: 'Roronoa Zoro', pullRate: 1.5, coinValue: 2500, rarity: 'Super Rare' },
    { id: '5', name: 'Boa Hancock', pullRate: 2.0, coinValue: 2000, rarity: 'Super Rare' },
    
    // Rare
    { id: '6', name: 'Nami', pullRate: 4.0, coinValue: 800, rarity: 'Rare' },
    { id: '7', name: 'Sanji', pullRate: 4.0, coinValue: 750, rarity: 'Rare' },
    { id: '8', name: 'Tony Tony Chopper', pullRate: 4.5, coinValue: 600, rarity: 'Rare' },
    { id: '9', name: 'Nico Robin', pullRate: 4.5, coinValue: 650, rarity: 'Rare' },
    { id: '10', name: 'Franky', pullRate: 5.0, coinValue: 500, rarity: 'Rare' },
    
    // Uncommon
    { id: '11', name: 'Brook', pullRate: 8.0, coinValue: 200, rarity: 'Uncommon' },
    { id: '12', name: 'Jinbe', pullRate: 8.0, coinValue: 200, rarity: 'Uncommon' },
    { id: '13', name: 'Usopp', pullRate: 8.5, coinValue: 180, rarity: 'Uncommon' },
    { id: '14', name: 'Carrot', pullRate: 9.0, coinValue: 150, rarity: 'Uncommon' },
    { id: '15', name: 'Yamato', pullRate: 9.0, coinValue: 160, rarity: 'Uncommon' },
    
    // Common
    { id: '16', name: 'Marine Soldier', pullRate: 12.0, coinValue: 50, rarity: 'Common' },
    { id: '17', name: 'Pirate Fodder', pullRate: 12.0, coinValue: 50, rarity: 'Common' },
    { id: '18', name: 'Den Den Mushi', pullRate: 13.0, coinValue: 40, rarity: 'Common' },
    { id: '19', name: 'Treasure Map', pullRate: 13.0, coinValue: 40, rarity: 'Common' },
    { id: '20', name: 'Wanted Poster', pullRate: 14.0, coinValue: 30, rarity: 'Common' },
  ];

  console.log('📦 Using Sample One Piece Card Data');
  console.log(`📊 Cards: ${sampleCards.length}`);
  
  await runSimulationWithCards(sampleCards, iterations);
}

async function runSimulationWithBox(box: Box, iterations: number) {
  console.log(`\n📦 Box: ${box.name}`);
  console.log(`📊 Cards in box: ${box.cards.length}`);
  
  const cards = box.cards.map(card => ({
    id: card.id,
    name: card.name,
    pullRate: Number(card.pullRate),
    coinValue: Number(card.coinValue),
    rarity: card.rarity || 'Unknown',
  }));

  await runSimulationWithCards(cards, iterations);
}

async function runSimulationWithCards(cards: Card[], iterations: number) {
  console.log(`🔄 Simulations: ${iterations.toLocaleString()}`);
  
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
  console.log('═'.repeat(105));
  console.log('RESULTS');
  console.log('═'.repeat(105));
  console.log('');
  console.log(
    'Card Name'.padEnd(30) +
    'Rarity'.padEnd(15) +
    'Expected %'.padEnd(12) +
    'Actual %'.padEnd(12) +
    'Deviation'.padEnd(14) +
    'Pulls'.padEnd(10) +
    'Coin Value'
  );
  console.log('─'.repeat(105));

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
      r.name.substring(0, 29).padEnd(30) +
      r.rarity.substring(0, 14).padEnd(15) +
      `${r.expected.toFixed(2)}%`.padEnd(12) +
      `${r.actual.toFixed(2)}%`.padEnd(12) +
      `${deviationStr} ${deviationColor}`.padEnd(14) +
      r.pulls.toString().padEnd(10) +
      r.coinValue.toString()
    );
  });

  console.log('─'.repeat(105));
  
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

  // Rarity breakdown
  console.log('\n📦 RARITY BREAKDOWN');
  console.log('─'.repeat(40));
  
  const rarityGroups = new Map<string, { expected: number; actual: number; count: number }>();
  
  results.forEach(r => {
    if (!rarityGroups.has(r.rarity)) {
      rarityGroups.set(r.rarity, { expected: 0, actual: 0, count: 0 });
    }
    const group = rarityGroups.get(r.rarity)!;
    group.expected += r.expected;
    group.actual += r.actual;
    group.count++;
  });

  rarityGroups.forEach((data, rarity) => {
    const diff = data.actual - data.expected;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`;
    console.log(
      `${rarity.padEnd(15)} Expected: ${data.expected.toFixed(2).padStart(6)}%  Actual: ${data.actual.toFixed(2).padStart(6)}%  (${diffStr})`
    );
  });
  
  console.log('\n═'.repeat(60));
  console.log('Legend: ✓ = <1% deviation, ~ = 1-2% deviation, ⚠ = >2% deviation');
  console.log('═'.repeat(60));
}

// Run
runSimulation(1000);







