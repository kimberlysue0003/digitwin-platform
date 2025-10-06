// Test PostgreSQL connection with pg package
const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5433,
  database: 'digitwin',
  user: 'postgres',
  password: 'digitwin123',
});

async function main() {
  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const result = await client.query('SELECT version()');
    console.log('PostgreSQL version:', result.rows[0].version);

    await client.end();
  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error.message);
  }
}

main();
