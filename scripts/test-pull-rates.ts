/**
 * Test script to verify pull rate distribution accuracy
 * This simulates pulling cards and checks if the distribution matches expected rates
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Simulate the same logic as the API
function getRandomCardFromPool(cards: any[]) {
  const totalPullRate = cards.reduce((sum, card) => {
    return sum + Number(card.pullRate);
  }, 0);

  const random = Math.random() * totalPullRate;
  
  let accumulator = 0;
  for (const card of cards) {
    accumulator += Number(card.pullRate);
    if (random <= accumulator) {
      return card;
    }
  }
  
  return cards[cards.length - 1];
}

async function testPullRates() {
  console.log('🧪 Testing Pull Rate Distribution Accuracy\n');
  console.log('=' .repeat(60));

  try {
    // Get a box with cards
    const box = await prisma.box.findFirst({
      where: { 
        isActive: true,
        cards: { some: {} }
      },
      include: { cards: true }
    });

    if (!box) {
      console.log('❌ No active box with cards found. Please create a box with cards first.');
      return;
    }

    console.log(`📦 Testing Box: ${box.name}`);
    console.log(`📊 Number of different cards: ${box.cards.length}\n`);

    // Check if pull rates sum to 100%
    const totalRate = box.cards.reduce((sum, card) => sum + Number(card.pullRate), 0);
    console.log(`📈 Total Pull Rate: ${totalRate.toFixed(3)}%`);
    
    if (Math.abs(totalRate - 100) > 0.01) {
      console.log(`⚠️  Warning: Total pull rate is not 100%!\n`);
    }

    // Display expected rates
    console.log('\n📋 Expected Pull Rates:');
    console.log('-'.repeat(60));
    
    const sortedCards = [...box.cards].sort((a, b) => Number(b.pullRate) - Number(a.pullRate));
    for (const card of sortedCards) {
      const rate = Number(card.pullRate);
      const bar = '█'.repeat(Math.round(rate / 2));
      console.log(`${card.name.padEnd(30)} ${rate.toFixed(3).padStart(8)}% ${bar}`);
    }

    // Run simulation
    const numSimulations = 100000; // 100k pulls for statistical accuracy
    console.log(`\n🎰 Running ${numSimulations.toLocaleString()} simulated pulls...`);
    
    const pullCounts = new Map<string, number>();
    
    // Initialize counters
    for (const card of box.cards) {
      pullCounts.set(card.id, 0);
    }
    
    // Simulate pulls
    const startTime = Date.now();
    for (let i = 0; i < numSimulations; i++) {
      const pulled = getRandomCardFromPool(box.cards);
      pullCounts.set(pulled.id, (pullCounts.get(pulled.id) || 0) + 1);
      
      // Progress indicator
      if (i > 0 && i % 10000 === 0) {
        process.stdout.write(`\r   Progress: ${((i / numSimulations) * 100).toFixed(0)}%`);
      }
    }
    process.stdout.write(`\r   Progress: 100% ✅\n`);
    
    const duration = Date.now() - startTime;
    console.log(`   Completed in ${(duration / 1000).toFixed(2)} seconds`);

    // Calculate actual rates and errors
    console.log('\n📊 Actual vs Expected Results:');
    console.log('-'.repeat(80));
    console.log('Card Name'.padEnd(30) + 'Expected %'.padEnd(12) + 'Actual %'.padEnd(12) + 'Difference'.padEnd(12) + 'Error %');
    console.log('-'.repeat(80));
    
    let totalError = 0;
    const results = [];
    
    for (const card of sortedCards) {
      const expectedRate = Number(card.pullRate);
      const actualCount = pullCounts.get(card.id) || 0;
      const actualRate = (actualCount / numSimulations) * 100;
      const difference = actualRate - expectedRate;
      const errorPercent = expectedRate > 0 ? (Math.abs(difference) / expectedRate) * 100 : 0;
      
      totalError += Math.abs(difference);
      
      results.push({
        name: card.name,
        expectedRate,
        actualRate,
        difference,
        errorPercent
      });
      
      // Color code based on error margin
      const errorIndicator = errorPercent < 5 ? '✅' : errorPercent < 10 ? '⚠️' : '❌';
      
      console.log(
        card.name.substring(0, 29).padEnd(30) +
        expectedRate.toFixed(3).padStart(10) + '% ' +
        actualRate.toFixed(3).padStart(10) + '% ' +
        (difference >= 0 ? '+' : '') + difference.toFixed(3).padStart(10) + '% ' +
        errorPercent.toFixed(2).padStart(8) + '% ' +
        errorIndicator
      );
    }
    
    console.log('-'.repeat(80));
    
    // Statistical summary
    const avgError = totalError / box.cards.length;
    const maxError = Math.max(...results.map(r => Math.abs(r.difference)));
    
    console.log('\n📈 Statistical Summary:');
    console.log(`   Average Absolute Error: ${avgError.toFixed(3)}%`);
    console.log(`   Maximum Absolute Error: ${maxError.toFixed(3)}%`);
    
    // Chi-square test for goodness of fit
    let chiSquare = 0;
    for (const card of box.cards) {
      const expected = (Number(card.pullRate) / 100) * numSimulations;
      const actual = pullCounts.get(card.id) || 0;
      if (expected > 0) {
        chiSquare += Math.pow(actual - expected, 2) / expected;
      }
    }
    
    const degreesOfFreedom = box.cards.length - 1;
    console.log(`   Chi-Square Statistic: ${chiSquare.toFixed(2)} (df=${degreesOfFreedom})`);
    
    // Rule of thumb: chi-square should be close to degrees of freedom
    const chiSquareRatio = chiSquare / degreesOfFreedom;
    if (chiSquareRatio < 1.5) {
      console.log(`   ✅ Distribution is statistically accurate (ratio: ${chiSquareRatio.toFixed(2)})`);
    } else if (chiSquareRatio < 2.0) {
      console.log(`   ⚠️  Distribution shows minor deviation (ratio: ${chiSquareRatio.toFixed(2)})`);
    } else {
      console.log(`   ❌ Distribution shows significant deviation (ratio: ${chiSquareRatio.toFixed(2)})`);
    }
    
    // Test edge cases
    console.log('\n🔍 Edge Case Tests:');
    
    // Test with very rare cards
    const rareCards = box.cards.filter(c => Number(c.pullRate) < 1);
    if (rareCards.length > 0) {
      console.log(`   Rare cards (<1% pull rate): ${rareCards.length}`);
      for (const card of rareCards) {
        const count = pullCounts.get(card.id) || 0;
        const expected = (Number(card.pullRate) / 100) * numSimulations;
        console.log(`   - ${card.name}: Expected ${expected.toFixed(0)}, Got ${count}`);
      }
    }
    
    // Test with common cards
    const commonCards = box.cards.filter(c => Number(c.pullRate) > 10);
    if (commonCards.length > 0) {
      console.log(`   Common cards (>10% pull rate): ${commonCards.length}`);
    }
    
    console.log('\n✅ Pull rate testing complete!');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPullRates().catch(console.error);
