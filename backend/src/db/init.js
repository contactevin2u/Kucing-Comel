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
        console.log('Cleaning up non-Lilien products...');
        await db.query(`DELETE FROM products WHERE name NOT LIKE 'Lilien%' AND name NOT LIKE '%Lilien%'`);

        // Update existing product prices
        console.log('Updating product prices...');
        await db.query(`UPDATE products SET price = 7.60, member_price = 6.84 WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'`);
        await db.query(`UPDATE products SET price = 139.90, member_price = 119.90 WHERE name = '[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L'`);
        await db.query(`UPDATE products SET price = 18.90, member_price = 15.90 WHERE name = 'Lilien Creamy Cat Treats - 3 Flavours Box'`);
        console.log('Prices updated!');

        const lilienCheck = await db.query(`
          SELECT EXISTS (
            SELECT FROM products WHERE name LIKE 'Lilien%' OR name LIKE '%Lilien%'
          );
        `);

        if (lilienCheck.rows[0].exists) {
          console.log('Database ready with Lilien products only');
          return;
        }

        console.log('Adding Lilien products...');
        await db.query(`
          INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES
          ('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop. Keeps your cat''s litter box fresh and clean.', 7.60, 6.84, '/products/litter-6l.jpg', 'Litter', 200),
          ('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 139.90, 119.90, '/products/litter-carton.jpg', 'Litter', 50),
          ('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 18.90, 15.90, '/products/creamy-treats.jpg', 'Food', 300)
          ON CONFLICT DO NOTHING;
        `);
        console.log('Lilien products added!');
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
        console.log('Cleaning up non-Lilien products...');
        db.query(`DELETE FROM products WHERE name NOT LIKE 'Lilien%' AND name NOT LIKE '%Lilien%'`);

        const lilienCheck = db.query(`
          SELECT id FROM products WHERE name LIKE 'Lilien%' OR name LIKE '%Lilien%' LIMIT 1
        `);

        if (lilienCheck.rows.length > 0) {
          console.log('Database ready with Lilien products only');
          return;
        }

        console.log('Adding Lilien products...');
        db.db.exec(`
          INSERT OR IGNORE INTO products (name, description, price, member_price, image_url, category, stock) VALUES
          ('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop. Keeps your cat''s litter box fresh and clean.', 7.60, 6.84, '/products/litter-6l.jpg', 'Litter', 200),
          ('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter with superior odor control. Low dust formula, easy to scoop.', 139.90, 119.90, '/products/litter-carton.jpg', 'Litter', 50),
          ('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours! Perfect for training, bonding, or just spoiling your beloved cat. Made with real ingredients.', 18.90, 15.90, '/products/creamy-treats.jpg', 'Food', 300)
        `);
        console.log('Lilien products added!');
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
