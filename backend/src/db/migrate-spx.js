/**
 * SPX Shipping Migration Script
 * Adds columns needed for Shopee Express shipping workflow:
 * - products.weight: Product weight in kg (default 0.5kg)
 * - orders.shipping_postcode: Malaysian postcode for delivery
 * - orders.tracking_number: SPX tracking number
 */

const db = require('../config/database');

const isPostgres = db.isProduction;

async function migrate() {
  console.log('Starting SPX migration...');
  console.log(`Database type: ${isPostgres ? 'PostgreSQL' : 'SQLite'}`);

  try {
    // Add weight column to products table
    console.log('\n1. Adding weight column to products table...');
    try {
      if (isPostgres) {
        await db.query(`
          ALTER TABLE products
          ADD COLUMN IF NOT EXISTS weight DECIMAL(6,3) DEFAULT 0.5
        `);
      } else {
        // SQLite doesn't support IF NOT EXISTS for columns, check first
        const columns = await db.query(`PRAGMA table_info(products)`);
        const hasWeight = columns.rows.some(col => col.name === 'weight');
        if (!hasWeight) {
          await db.query(`ALTER TABLE products ADD COLUMN weight DECIMAL(6,3) DEFAULT 0.5`);
        } else {
          console.log('   Column already exists, skipping.');
        }
      }
      console.log('   Done.');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('   Column already exists, skipping.');
      } else {
        throw err;
      }
    }

    // Add shipping_postcode column to orders table
    console.log('\n2. Adding shipping_postcode column to orders table...');
    try {
      if (isPostgres) {
        await db.query(`
          ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS shipping_postcode VARCHAR(10)
        `);
      } else {
        const columns = await db.query(`PRAGMA table_info(orders)`);
        const hasPostcode = columns.rows.some(col => col.name === 'shipping_postcode');
        if (!hasPostcode) {
          await db.query(`ALTER TABLE orders ADD COLUMN shipping_postcode VARCHAR(10)`);
        } else {
          console.log('   Column already exists, skipping.');
        }
      }
      console.log('   Done.');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('   Column already exists, skipping.');
      } else {
        throw err;
      }
    }

    // Add tracking_number column to orders table
    console.log('\n3. Adding tracking_number column to orders table...');
    try {
      if (isPostgres) {
        await db.query(`
          ALTER TABLE orders
          ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(50)
        `);
      } else {
        const columns = await db.query(`PRAGMA table_info(orders)`);
        const hasTracking = columns.rows.some(col => col.name === 'tracking_number');
        if (!hasTracking) {
          await db.query(`ALTER TABLE orders ADD COLUMN tracking_number VARCHAR(50)`);
        } else {
          console.log('   Column already exists, skipping.');
        }
      }
      console.log('   Done.');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('duplicate column')) {
        console.log('   Column already exists, skipping.');
      } else {
        throw err;
      }
    }

    console.log('\n========================================');
    console.log('SPX Migration completed successfully!');
    console.log('========================================');
    console.log('\nNew columns added:');
    console.log('  - products.weight (DECIMAL 6,3, default 0.5)');
    console.log('  - orders.shipping_postcode (VARCHAR 10)');
    console.log('  - orders.tracking_number (VARCHAR 50)');
    console.log('\nYou can now use the SPX shipping workflow.');

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
