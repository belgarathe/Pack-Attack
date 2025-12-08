import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  console.log('Starting admin creation...');
  
  // Use environment variables for credentials - DO NOT hardcode!
  const email = process.env.ADMIN_EMAIL || 'admin@packattack.com';
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Admin User';

  // Validate password is provided via environment variable
  if (!password) {
    console.error('❌ ERROR: ADMIN_PASSWORD environment variable is required!');
    console.error('');
    console.error('Please set the following environment variables:');
    console.error('  ADMIN_EMAIL="your-admin-email@example.com"');
    console.error('  ADMIN_PASSWORD="your-secure-password"');
    console.error('  ADMIN_NAME="Admin User" (optional)');
    console.error('');
    console.error('Example:');
    console.error('  ADMIN_PASSWORD="MySecureP@ssw0rd!" npm run create-admin');
    console.error('');
    process.exit(1);
  }

  // Validate password strength
  if (password.length < 8) {
    console.error('❌ ERROR: Password must be at least 8 characters long!');
    process.exit(1);
  }

  try {
    // Check if admin already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('Admin user already exists. Updating to admin role...');
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: 'ADMIN',
          name,
        },
      });
      console.log('✅ Admin user updated successfully!');
      console.log(`Email: ${email}`);
      console.log('Password: [hidden - use the password you provided]');
    } else {
      // Create new admin user
      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name,
          role: 'ADMIN',
          coins: 10000, // Give admin some starting coins
        },
      });
      console.log('✅ Admin user created successfully!');
      console.log(`Email: ${email}`);
      console.log('Password: [hidden - use the password you provided]');
      console.log(`User ID: ${user.id}`);
    }
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
