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
      // Check if Lilien products exist
      const lilienCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM products WHERE name LIKE 'Lilien%'
        );
      `);

      if (lilienCheck.rows[0].exists) {
        console.log('Database already initialized with Lilien products');
        return;
      }

      // Add new Lilien products
      console.log('Adding new Lilien products...');
      await db.query(`
        INSERT INTO products (name, description, price, image_url, category, stock) VALUES
        ('Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter. Superior odor control, low dust formula, easy to scoop.', 25.90, '/products/litter-6l.jpg', 'Litter', 200),
        ('[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags - Save more! Premium quality super clumping cat litter.', 139.90, '/products/litter-carton.jpg', 'Litter', 50),
        ('Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats in 3 delicious flavours!', 18.90, '/products/creamy-treats.jpg', 'Food', 300)
        ON CONFLICT DO NOTHING;
      `);
      console.log('Lilien products added!');
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
