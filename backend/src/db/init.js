const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const migrateLitter = require('./migrate-litter');
const migrateLitterDescription = require('./migrate-litter-description');

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

        // Add delivery_fee column for admin dashboard
        try {
          await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(10, 2) DEFAULT 8.00`);
          console.log('Delivery fee column added to orders table');
        } catch (e) {
          console.log('Delivery fee column may already exist');
        }

        // Add voucher columns to orders
        try {
          await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_code VARCHAR(50)`);
          await db.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS voucher_discount DECIMAL(10, 2) DEFAULT 0`);
          console.log('Voucher columns added to orders table');
        } catch (e) {
          console.log('Voucher columns may already exist');
        }

        // Create vouchers table
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS vouchers (
              id SERIAL PRIMARY KEY,
              code VARCHAR(50) NOT NULL UNIQUE,
              discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
              discount_amount DECIMAL(10, 2) NOT NULL,
              max_discount DECIMAL(10, 2),
              min_order_amount DECIMAL(10, 2),
              start_date TIMESTAMP,
              expiry_date TIMESTAMP,
              usage_limit INTEGER,
              times_used INTEGER DEFAULT 0,
              is_active BOOLEAN DEFAULT true,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
          `);
          console.log('Vouchers table ensured');
        } catch (e) {
          console.log('Vouchers table may already exist');
        }

        // Create wishlist table if not exists
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS wishlist (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, product_id)
            );
            CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
          `);
          console.log('Wishlist table ensured');
        } catch (e) {
          console.log('Wishlist table may already exist');
        }

        // Create addresses table if not exists
        try {
          await db.query(`
            CREATE TABLE IF NOT EXISTS addresses (
              id SERIAL PRIMARY KEY,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              label VARCHAR(50) DEFAULT 'Home',
              recipient_name VARCHAR(255) NOT NULL,
              phone VARCHAR(20) NOT NULL,
              address_line1 VARCHAR(255) NOT NULL,
              address_line2 VARCHAR(255),
              city VARCHAR(100) NOT NULL,
              state VARCHAR(100) NOT NULL,
              postal_code VARCHAR(20) NOT NULL,
              country VARCHAR(100) DEFAULT 'Malaysia',
              is_default BOOLEAN DEFAULT false,
              created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
          `);
          console.log('Addresses table ensured');
        } catch (e) {
          console.log('Addresses table may already exist');
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

        // Add delivery_fee column for SQLite
        try {
          db.db.exec(`ALTER TABLE orders ADD COLUMN delivery_fee REAL DEFAULT 8.00`);
        } catch (e) { /* column exists */ }

        // Add voucher columns for SQLite
        try {
          db.db.exec(`ALTER TABLE orders ADD COLUMN voucher_code TEXT`);
        } catch (e) { /* column exists */ }
        try {
          db.db.exec(`ALTER TABLE orders ADD COLUMN voucher_discount REAL DEFAULT 0`);
        } catch (e) { /* column exists */ }

        // Create vouchers table for SQLite
        try {
          db.db.exec(`
            CREATE TABLE IF NOT EXISTS vouchers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              code TEXT NOT NULL UNIQUE,
              discount_type TEXT NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
              discount_amount REAL NOT NULL,
              max_discount REAL,
              min_order_amount REAL,
              start_date TEXT,
              expiry_date TEXT,
              usage_limit INTEGER,
              times_used INTEGER DEFAULT 0,
              is_active INTEGER DEFAULT 1,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
          `);
          console.log('Vouchers table ensured');
        } catch (e) { /* table exists */ }

        // Create wishlist table for SQLite
        try {
          db.db.exec(`
            CREATE TABLE IF NOT EXISTS wishlist (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              UNIQUE(user_id, product_id)
            );
            CREATE INDEX IF NOT EXISTS idx_wishlist_user ON wishlist(user_id);
          `);
          console.log('Wishlist table ensured');
        } catch (e) { /* table exists */ }

        // Create addresses table for SQLite
        try {
          db.db.exec(`
            CREATE TABLE IF NOT EXISTS addresses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
              label TEXT DEFAULT 'Home',
              recipient_name TEXT NOT NULL,
              phone TEXT NOT NULL,
              address_line1 TEXT NOT NULL,
              address_line2 TEXT,
              city TEXT NOT NULL,
              state TEXT NOT NULL,
              postal_code TEXT NOT NULL,
              country TEXT DEFAULT 'Malaysia',
              is_default INTEGER DEFAULT 0,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);
          `);
          console.log('Addresses table ensured');
        } catch (e) { /* table exists */ }

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

          // Seed variants for SQLite (only treats - litter products are standalone per scent)
          db.db.exec(`
            INSERT OR IGNORE INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
            (7, 'Chicken', 14.00, 12.60, 100),
            (7, 'Tuna', 14.00, 12.60, 100),
            (7, 'Salmon', 14.00, 12.60, 100),
            (7, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50);
          `);
          console.log('Product variants seeded');
        }
        console.log('Database already initialized');
      }
    }

    // Run litter product migration
    await migrateLitter();

    // Run litter description update
    await migrateLitterDescription();

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
      if (product.name.includes('Treats')) {
        // Treats variants only - litter products are standalone per scent
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Chicken', 14.00, 12.60, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Tuna', 14.00, 12.60, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Salmon', 14.00, 12.60, 100) ON CONFLICT DO NOTHING`, [product.id]);
        await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50) ON CONFLICT DO NOTHING`, [product.id]);
      }
    }
    console.log('Product variants seeded');
  } catch (error) {
    console.error('Error seeding variants:', error.message);
  }
}

module.exports = initializeDatabase;
