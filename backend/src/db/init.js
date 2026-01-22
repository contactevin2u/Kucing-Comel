const fs = require('fs');
const path = require('path');
const db = require('../config/database');

async function initializeDatabase() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // PostgreSQL initialization
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'products'
        );
      `);

      if (tableCheck.rows[0].exists) {
        // Delete ALL products and reseed with correct prices
        console.log('Resetting products with correct prices...');
        await db.query(`DELETE FROM products`);

        // Insert products one at a time
        try {
          await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop.', 7.60, 6.84, '/products/litter-6l.jpg', 'Litter', 200)`);
          console.log('Product 1 inserted');
        } catch (e) {
          console.error('Product 1 error:', e.message);
        }

        try {
          await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter.', 139.90, 119.90, '/products/litter-carton.jpg', 'Litter', 50)`);
          console.log('Product 2 inserted');
        } catch (e) {
          console.error('Product 2 error:', e.message);
        }

        try {
          await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours!', 18.90, 15.90, '/products/creamy-treats.jpg', 'Food', 300)`);
          console.log('Product 3 inserted');
        } catch (e) {
          console.error('Product 3 error:', e.message);
        }

        console.log('Products reseeded!');
        return;
      }

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
      // SQLite initialization
      const tableCheck = db.query(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='products'
      `);

      if (tableCheck.rows.length > 0) {
        console.log('Resetting products...');
        db.query(`DELETE FROM products`);

        db.db.exec(`
          INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES
          ('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop.', 7.60, 6.84, '/products/litter-6l.jpg', 'Litter', 200),
          ('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter.', 139.90, 119.90, '/products/litter-carton.jpg', 'Litter', 50),
          ('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours!', 18.90, 15.90, '/products/creamy-treats.jpg', 'Food', 300)
        `);
        console.log('Products reseeded!');
        return;
      }

      console.log('Initializing database...');
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = fs.readFileSync(schemaPath, 'utf8');
      db.db.exec(schema);
      console.log('Schema created');

      const seedPath = path.join(__dirname, 'seed.sql');
      const seed = fs.readFileSync(seedPath, 'utf8');
      db.db.exec(seed);
      console.log('Seed data inserted');
    }

    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Database initialization error:', error.message);
  }
}

module.exports = initializeDatabase;
