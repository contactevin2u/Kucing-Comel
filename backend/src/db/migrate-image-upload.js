/**
 * Migration: Add image_data and image_mime columns to products table
 * Supports both PostgreSQL (production) and SQLite (local development)
 *
 * Run: node backend/src/db/migrate-image-upload.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

const db = require('../config/database');

async function migrate() {
  console.log(`Running image upload migration (${db.isProduction ? 'PostgreSQL' : 'SQLite'})...`);

  try {
    // Add image_data column
    try {
      if (db.isProduction) {
        await db.query('ALTER TABLE products ADD COLUMN image_data TEXT');
      } else {
        await db.query('ALTER TABLE products ADD COLUMN image_data TEXT');
      }
      console.log('Added image_data column');
    } catch (e) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate column'))) {
        console.log('image_data column already exists, skipping');
      } else {
        throw e;
      }
    }

    // Add image_mime column
    try {
      if (db.isProduction) {
        await db.query('ALTER TABLE products ADD COLUMN image_mime VARCHAR(50)');
      } else {
        await db.query('ALTER TABLE products ADD COLUMN image_mime VARCHAR(50)');
      }
      console.log('Added image_mime column');
    } catch (e) {
      if (e.message && (e.message.includes('already exists') || e.message.includes('duplicate column'))) {
        console.log('image_mime column already exists, skipping');
      } else {
        throw e;
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

migrate();
