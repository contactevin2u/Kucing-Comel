const db = require('../config/database');

async function migrateLitterProduct() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('Migrating litter product data...');

    if (isProduction) {
      // PostgreSQL
      // Get the product ID by name
      const result = await db.query(`
        SELECT id FROM products WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'
      `);

      if (result.rows.length === 0) {
        console.log('Litter product not found, skipping migration');
        return;
      }

      const productId = result.rows[0].id;
      console.log('Found litter product with ID:', productId);

      // Update product image and description
      const newDescription = `Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin`;

      await db.query(`
        UPDATE products
        SET image_url = '/Lilien Premium Super Clumping Cat Litter 6L/Main/1.jfif',
            description = $2
        WHERE id = $1
      `, [productId, newDescription]);
      console.log('Updated product image URL and description');

      // Delete old variants
      await db.query(`DELETE FROM product_variants WHERE product_id = $1`, [productId]);
      console.log('Deleted old variants');

      // Insert new variants
      await db.query(`
        INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
        ($1, 'Charcoal', 7.60, 6.84, 80),
        ($1, 'Fresh Milk', 7.60, 6.84, 60),
        ($1, 'Lavender', 7.60, 6.84, 60)
      `, [productId]);
      console.log('Inserted new variants');

    } else {
      // SQLite
      const result = db.query(`
        SELECT id FROM products WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'
      `);

      if (result.rows.length === 0) {
        console.log('Litter product not found, skipping migration');
        return;
      }

      const productId = result.rows[0].id;
      console.log('Found litter product with ID:', productId);

      const newDescription = `Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

Key Features
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushin`;

      db.db.exec(`
        UPDATE products
        SET image_url = '/Lilien Premium Super Clumping Cat Litter 6L/Main/1.jfif',
            description = '${newDescription.replace(/'/g, "''")}'
        WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'
      `);
      console.log('Updated product image URL and description');

      db.db.exec(`DELETE FROM product_variants WHERE product_id = ${productId}`);
      console.log('Deleted old variants');

      db.db.exec(`
        INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES
        (${productId}, 'Charcoal', 7.60, 6.84, 80),
        (${productId}, 'Fresh Milk', 7.60, 6.84, 60),
        (${productId}, 'Lavender', 7.60, 6.84, 60)
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
