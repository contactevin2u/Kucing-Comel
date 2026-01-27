const db = require('../config/database');

async function migrateLitterProduct() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('Migrating litter product data...');

    if (isProduction) {
      // PostgreSQL
      // Update product image
      await db.query(`
        UPDATE products
        SET image_url = '/Lilien Premium Super Clumping Cat Litter 6L/Main/1.jfif'
        WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'
      `);
      console.log('Updated product image URL');

      // Delete old variants for litter 6L (product_id = 1)
      await db.query(`DELETE FROM product_variants WHERE product_id = 1`);
      console.log('Deleted old variants');

      // Insert new variants
      await db.query(`
        INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
        (1, 'Charcoal', 7.60, 6.84, 80),
        (1, 'Fresh Milk', 7.60, 6.84, 60),
        (1, 'Lavender', 7.60, 6.84, 60)
      `);
      console.log('Inserted new variants');

    } else {
      // SQLite
      db.db.exec(`
        UPDATE products
        SET image_url = '/Lilien Premium Super Clumping Cat Litter 6L/Main/1.jfif'
        WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'
      `);
      console.log('Updated product image URL');

      db.db.exec(`DELETE FROM product_variants WHERE product_id = 1`);
      console.log('Deleted old variants');

      db.db.exec(`
        INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
        (1, 'Charcoal', 7.60, 6.84, 80),
        (1, 'Fresh Milk', 7.60, 6.84, 60),
        (1, 'Lavender', 7.60, 6.84, 60)
      `);
      console.log('Inserted new variants');
    }

    console.log('Migration complete!');
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  migrateLitterProduct().then(() => process.exit(0));
}

module.exports = migrateLitterProduct;
