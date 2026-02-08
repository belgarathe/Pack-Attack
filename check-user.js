const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.user.findUnique({
      where: { email: "tim@meggert.email" },
      select: { 
        id: true, 
        email: true, 
        name: true, 
        role: true, 
        emailVerified: true,
        createdAt: true
      }
    });
    
    if (user) {
      console.log("User found:");
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log("No user found with email: tim@meggert.email");
    }
    
    // Also list all users
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true
      }
    });
    
    console.log("\nAll users in database:");
    console.log(JSON.stringify(allUsers, null, 2));
    
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
