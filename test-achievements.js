const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAchievementSystem() {
  console.log('🧪 Testing Achievement System\n');
  
  try {
    // Test 1: Check if achievements exist in database
    console.log('Test 1: Checking achievements in database...');
    const achievements = await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });
    console.log(`✅ Found ${achievements.length} achievements in database\n`);
    
    if (achievements.length === 0) {
      console.log('❌ ERROR: No achievements found in database!');
      console.log('Run: npm run build to ensure achievements are synced\n');
      return;
    }

    // Test 2: Get a test user
    console.log('Test 2: Finding test user...');
    const user = await prisma.user.findFirst({
      where: {
        email: { not: null },
      },
      include: {
        achievements: {
          include: {
            achievement: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ ERROR: No users found in database!');
      return;
    }
    
    console.log(`✅ Found test user: ${user.email}`);
    console.log(`   Current coins: ${user.coins}`);
    console.log(`   User achievements: ${user.achievements.length}\n`);

    // Test 3: Check for unlocked but unclaimed achievements
    console.log('Test 3: Checking for unlocked but unclaimed achievements...');
    const unclaimedAchievements = user.achievements.filter(
      ua => ua.unlockedAt !== null && !ua.rewardClaimed
    );
    
    console.log(`✅ Found ${unclaimedAchievements.length} unclaimed achievements:`);
    unclaimedAchievements.forEach(ua => {
      console.log(`   - ${ua.achievement.name}: ${ua.achievement.coinReward} coins`);
    });
    console.log();

    // Test 4: Check achievement claim logic
    if (unclaimedAchievements.length > 0) {
      const testAchievement = unclaimedAchievements[0];
      console.log(`Test 4: Testing claim logic for "${testAchievement.achievement.name}"...`);
      
      const coinReward = Number(testAchievement.achievement.coinReward);
      console.log(`   Coin reward: ${coinReward}`);
      console.log(`   User ID: ${user.id}`);
      console.log(`   Achievement ID: ${testAchievement.achievementId}`);
      console.log(`   Is unlocked: ${testAchievement.unlockedAt !== null}`);
      console.log(`   Is claimed: ${testAchievement.rewardClaimed}`);
      
      // Test the transaction logic (without actually executing)
      console.log('\n   Transaction would:');
      console.log(`   1. Increment user coins by ${coinReward}`);
      console.log(`   2. Mark achievement as claimed`);
      console.log(`   3. New balance would be: ${Number(user.coins) + coinReward}\n`);
    } else {
      console.log('Test 4: No unclaimed achievements to test claim logic\n');
    }

    // Test 5: Check database schema
    console.log('Test 5: Checking database schema...');
    const userAchievementFields = await prisma.$queryRaw`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'UserAchievement'
      ORDER BY ordinal_position;
    `;
    console.log('UserAchievement table structure:');
    console.log(userAchievementFields);
    console.log();

    // Test 6: Test a simulated claim
    if (unclaimedAchievements.length > 0) {
      console.log('Test 6: Simulating a claim operation...');
      const testAchievement = unclaimedAchievements[0];
      const coinReward = Number(testAchievement.achievement.coinReward);
      
      // Perform the actual claim operation
      const [updatedUser] = await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { coins: { increment: coinReward } },
        }),
        prisma.userAchievement.update({
          where: { id: testAchievement.id },
          data: { rewardClaimed: true },
        }),
      ]);

      console.log(`✅ Successfully claimed "${testAchievement.achievement.name}"`);
      console.log(`   Old balance: ${user.coins}`);
      console.log(`   Coins added: ${coinReward}`);
      console.log(`   New balance: ${updatedUser.coins}`);
      console.log(`   Expected: ${Number(user.coins) + coinReward}`);
      
      if (Number(updatedUser.coins) === Number(user.coins) + coinReward) {
        console.log('✅ Coin increment working correctly!\n');
      } else {
        console.log('❌ ERROR: Coin increment mismatch!\n');
      }
    } else {
      console.log('Test 6: No unclaimed achievements to test claim\n');
    }

    console.log('✅ All tests completed!');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAchievementSystem();
