// Test PostgreSQL connection
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://postgres:digitwin123@127.0.0.1:5432/digitwin?schema=public'
    }
  },
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful!');

    // Test query
    const result = await prisma.$queryRaw`SELECT version()`;
    console.log('PostgreSQL version:', result);

  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
