const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('PackAttack2026!Secure', 10);
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@pack-attack.de' },
      update: {},
      create: {
        email: 'admin@pack-attack.de',
        name: 'Admin User',
        password: hashedPassword,
        role: 'ADMIN',
        emailVerified: new Date(),
        coins: 10000
      }
    });
    
    console.log('✅ Admin account created successfully!');
    console.log('');
    console.log('Login credentials:');
    console.log('  Email: admin@pack-attack.de');
    console.log('  Password: PackAttack2026!Secure');
    console.log('  Role:', admin.role);
    console.log('');
    console.log('Visit: https://pack-attack.de/login');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
