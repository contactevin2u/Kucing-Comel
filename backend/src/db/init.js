const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function initializeDatabase() {
  try {
    // Check if tables exist
    const tableCheck = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'products'
      );
    `);

    if (tableCheck.rows[0].exists) {
      console.log('Database already initialized');
      return;
    }

    console.log('Initializing database...');

    // Read and run schema
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await db.query(schema);
    console.log('Schema created');

    // Read and run seed
    const seedPath = path.join(__dirname, 'seed.sql');
    const seed = fs.readFileSync(seedPath, 'utf8');
    await db.query(seed);
    console.log('Seed data inserted');

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

module.exports = initializeDatabase;
