import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Test user accounts with simple credentials for testing
const testUsers = [
  { email: 'test1@packattack.com', password: 'TestPass1!', name: 'Test User 1' },
  { email: 'test2@packattack.com', password: 'TestPass2!', name: 'Test User 2' },
  { email: 'test3@packattack.com', password: 'TestPass3!', name: 'Test User 3' },
  { email: 'test4@packattack.com', password: 'TestPass4!', name: 'Test User 4' },
  { email: 'test5@packattack.com', password: 'TestPass5!', name: 'Test User 5' },
  { email: 'test6@packattack.com', password: 'TestPass6!', name: 'Test User 6' },
  { email: 'test7@packattack.com', password: 'TestPass7!', name: 'Test User 7' },
  { email: 'test8@packattack.com', password: 'TestPass8!', name: 'Test User 8' },
  { email: 'test9@packattack.com', password: 'TestPass9!', name: 'Test User 9' },
  { email: 'test10@packattack.com', password: 'TestPass10!', name: 'Test User 10' },
];

async function createTestUsers() {
  console.log('Creating 10 test user accounts...\n');
  
  const createdUsers: Array<{ email: string; password: string; name: string }> = [];
  const skippedUsers: string[] = [];
  
  try {
    for (const testUser of testUsers) {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: testUser.email },
      });

      if (existingUser) {
        console.log(`⚠️  User already exists: ${testUser.email}`);
        skippedUsers.push(testUser.email);
        continue;
      }

      // Hash the password
      const passwordHash = await bcrypt.hash(testUser.password, 10);

      // Create the user
      await prisma.user.create({
        data: {
          email: testUser.email,
          name: testUser.name,
          passwordHash,
          role: 'USER',
          emailVerified: true, // Pre-verified for testing
          coins: 5000, // Give test users coins to play with
        },
      });

      console.log(`✅ Created: ${testUser.email}`);
      createdUsers.push(testUser);
    }

    console.log('\n' + '='.repeat(60));
    console.log('TEST USER ACCOUNTS CREATED');
    console.log('='.repeat(60));
    console.log('\nYou can log in with these credentials:\n');
    
    console.log('| Email                      | Password      | Name          |');
    console.log('|----------------------------|---------------|---------------|');
    
    for (const user of testUsers) {
      const status = skippedUsers.includes(user.email) ? '(existed)' : '';
      console.log(`| ${user.email.padEnd(26)} | ${user.password.padEnd(13)} | ${user.name.padEnd(13)} | ${status}`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log(`Created: ${createdUsers.length} | Already existed: ${skippedUsers.length}`);
    console.log('Each test account has 5,000 coins and is pre-verified.');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();

