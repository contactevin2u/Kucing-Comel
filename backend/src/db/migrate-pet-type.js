/**
 * Migration: Add pet_type column to products table
 * Run with: node backend/src/db/migrate-pet-type.js
 */
const db = require('../config/database');

async function migrate() {
  console.log('Starting pet_type migration...');

  try {
    if (db.isProduction) {
      // PostgreSQL
      await db.query(`
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS pet_type VARCHAR(20)
      `);
      await db.query(`UPDATE products SET pet_type = 'cat' WHERE pet_type IS NULL`);
      await db.query(`CREATE INDEX IF NOT EXISTS idx_products_pet_type ON products(pet_type)`);
    } else {
      // SQLite - check if column exists first
      const tableInfo = db.db.pragma('table_info(products)');
      const hasPetType = tableInfo.some(col => col.name === 'pet_type');

      if (!hasPetType) {
        db.db.exec(`ALTER TABLE products ADD COLUMN pet_type TEXT`);
        console.log('Added pet_type column');
      } else {
        console.log('pet_type column already exists');
      }

      db.db.exec(`UPDATE products SET pet_type = 'cat' WHERE pet_type IS NULL`);
      db.db.exec(`CREATE INDEX IF NOT EXISTS idx_products_pet_type ON products(pet_type)`);
    }

    console.log('Migration completed successfully!');
    console.log('All existing products set to pet_type = "cat"');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
