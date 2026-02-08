const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyAdmin() {
  const updated = await prisma.user.update({
    where: { email: 'admin@pack-attack.de' },
    data: { 
      emailVerified: new Date(),
      role: 'ADMIN'
    }
  });
  
  console.log('✅ Admin email verified!');
  console.log('Email:', updated.email);
  console.log('Verified:', updated.emailVerified);
  console.log('Role:', updated.role);
  console.log('\nYou can now login at: https://pack-attack.de/login');
  await prisma.$disconnect();
}

verifyAdmin().catch(e => {
  console.error('Error:', e.message);
  prisma.$disconnect();
});
