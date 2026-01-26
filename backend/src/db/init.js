const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function initializeDatabase() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // PostgreSQL initialization
      console.log('Checking PostgreSQL database...');

      // Check if products table exists
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'products'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        // First time setup - run full schema and seed
        console.log('Initializing database...');
        const schemaPath = path.join(__dirname, 'schema-pg.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        await db.query(schema);
        console.log('Schema created');

        const seedPath = path.join(__dirname, 'seed-pg.sql');
        const seed = fs.readFileSync(seedPath, 'utf8');
        await db.query(seed);
        console.log('Seed data inserted');
      } else {
        // Database exists - ensure product_variants table exists
        const variantsTableCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_name = 'product_variants'
          );
        `);

        // Add SenangPay columns to orders table if they don't exist
        try {
          await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255)`);
          await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'stripe'`);
          await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255)`);
          console.log('SenangPay columns added to orders table');
        } catch (e) {
          console.log('SenangPay columns may already exist');
        }

        // Add guest checkout column
        try {
          await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_email VARCHAR(255)`);
          await db.query(`ALTER TABLE orders ALTER COLUMN user_id DROP NOT NULL`);
          console.log('Guest checkout column added to orders table');
        } catch (e) {
          console.log('Guest checkout column may already exist');
        }

        if (!variantsTableCheck.rows[0].exists) {
          console.log('Creating product_variants table...');
          await db.query(`
            CREATE TABLE IF NOT EXISTS product_variants (
              id SERIAL PRIMARY KEY,
              product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
              variant_name VARCHAR(255) NOT NULL,
              price DECIMAL(10, 2) NOT NULL,
              member_price DECIMAL(10, 2),
              stock INTEGER DEFAULT 0,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
          `);
          console.log('product_variants table created');

          // Add variant_id column to cart_items if not exists
          try {
            await db.query(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id INTEGER REFERENCES product_variants(id) ON DELETE CASCADE`);
            console.log('Added variant_id to cart_items');
          } catch (e) {
            console.log('variant_id column may already exist');
          }

          // Seed variants
          console.log('Seeding product variants...');
          await seedVariants();
        }
        console.log('Database already initialized');
      }

    } else {
      // SQLite initialization
      console.log('Checking SQLite database...');

      const tableCheck = db.query(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='products'
      `);

      if (tableCheck.rows.length === 0) {
        // First time setup
        console.log('Initializing database...');
        const schemaPath = path.join(__dirname, 'schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.db.exec(schema);
        console.log('Schema created');

        const seedPath = path.join(__dirname, 'seed.sql');
        const seed = fs.readFileSync(seedPath, 'utf8');
        db.db.exec(seed);
        console.log('Seed data inserted');
      } else {
        // Add SenangPay columns to orders table for SQLite
        try {
          db.db.exec(`ALTER TABLE orders ADD COLUMN payment_reference TEXT`);
        } catch (e) { /* column exists */ }
        try {
          db.db.exec(`ALTER TABLE orders ADD COLUMN payment_method TEXT DEFAULT 'stripe'`);
        } catch (e) { /* column exists */ }
        try {
          db.db.exec(`ALTER TABLE orders ADD COLUMN transaction_id TEXT`);
        } catch (e) { /* column exists */ }

        // Add guest checkout column for SQLite
        try {
          db.db.exec(`ALTER TABLE orders ADD COLUMN guest_email TEXT`);
        } catch (e) { /* column exists */ }

        // Check if product_variants table exists
        const variantsCheck = db.query(`
          SELECT name FROM sqlite_master
          WHERE type='table' AND name='product_variants'
        `);

        if (variantsCheck.rows.length === 0) {
          console.log('Creating product_variants table...');
          db.db.exec(`
            CREATE TABLE IF NOT EXISTS product_variants (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
              variant_name TEXT NOT NULL,
              price REAL NOT NULL,
              member_price REAL,
              stock INTEGER DEFAULT 0,
              is_active INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_product_variants_product ON product_variants(product_id);
          `);
          console.log('product_variants table created');

          // Seed variants for SQLite
          db.db.exec(`
            INSERT OR IGNORE INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
            (1, 'Original', 7.60, 6.84, 80),
            (1, 'Lavender', 8.00, 7.20, 60),
            (1, 'Green Tea', 8.00, 7.20, 60),
            (2, 'Original', 159.00, 143.10, 20),
            (2, 'Lavender', 168.00, 151.20, 15),
            (2, 'Green Tea', 168.00, 151.20, 15),
            (3, 'Chicken', 14.00, 12.60, 100),
            (3, 'Tuna', 14.00, 12.60, 100),
            (3, 'Salmon', 14.00, 12.60, 100),
            (3, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50),
            (4, '20mg | 8.5ml', 123.50, 111.15, 100),
            (4, '20mg | 30ml', 390.00, 351.00, 100),
            (4, '20mg | 50ml', 624.00, 561.60, 100),
            (4, '30mg | 8.5ml', 136.50, 122.85, 100),
            (4, '30mg | 30ml', 429.00, 386.10, 100),
            (4, '30mg | 50ml', 650.00, 585.00, 100),
            (4, '75mg | 10 Tabs', 195.00, 175.50, 100);
          `);
          console.log('Product variants seeded');
        }
        console.log('Database already initialized');
      }
    }

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

async function seedVariants() {
  try {
    // Get product IDs
    const products = await db.query('SELECT id, name FROM products ORDER BY id');

    for (const product of products.rows) {
      if (product.name.includes('Litter 6L') && !product.name.includes('CARTON')) {
        // Single bag variants
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Original', 7.60, 6.84, 80) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Lavender', 8.00, 7.20, 60) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Green Tea', 8.00, 7.20, 60) ON CONFLICT DO NOTHING`, [product.id]);
      } else if (product.name.includes('CARTON')) {
        // Carton variants
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Original', 159.00, 143.10, 20) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Lavender', 168.00, 151.20, 15) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Green Tea', 168.00, 151.20, 15) ON CONFLICT DO NOTHING`, [product.id]);
      } else if (product.name.includes('Treats')) {
        // Treats variants
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Chicken', 14.00, 12.60, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Tuna', 14.00, 12.60, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Salmon', 14.00, 12.60, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50) ON CONFLICT DO NOTHING`, [product.id]);
      } else if (product.name.includes('CARE FIP') || product.name.includes('GS-441524')) {
        // CARE FIP GS-441524 variants
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, '20mg | 8.5ml', 123.50, 111.15, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, '20mg | 30ml', 390.00, 351.00, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, '20mg | 50ml', 624.00, 561.60, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, '30mg | 8.5ml', 136.50, 122.85, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, '30mg | 30ml', 429.00, 386.10, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, '30mg | 50ml', 650.00, 585.00, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, '75mg | 10 Tabs', 195.00, 175.50, 100) ON CONFLICT DO NOTHING`, [product.id]);
      }
    }
    console.log('Product variants seeded');
  } catch (error) {
    console.error('Error seeding variants:', error.message);
  }
}

module.exports = initializeDatabase;
