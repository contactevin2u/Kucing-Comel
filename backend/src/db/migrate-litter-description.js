const db = require('../config/database');

async function migrateLitterDescription() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('Updating litter product description...');

    const newDescription = `Lilien Premium Cat Litter is a plant-based, eco-friendly litter designed to provide effective absorption, fast clumping, and reliable odor control for daily use. Made from natural, non-toxic ingredients, it supports a cleaner litter environment while remaining gentle on cats' paws. Each pack contains 1.6kg of litter, suitable for convenient handling and storage.

**Key Features**
Lilien Premium Cat Litter offers high absorption performance, helping to quickly soak up moisture and keep the litter box dry for longer periods. The fast-clumping formula forms firm clumps that are easy to scoop, supporting efficient daily cleaning. Odor control is enhanced to help trap and neutralize unpleasant smells, contributing to a fresher indoor environment. The low-dust formulation minimizes tracking and airborne particles, helping to maintain cleaner surroundings.

**Flushable & Eco-Friendly**
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushing in small amounts, offering a convenient and environmentally conscious disposal option.

**Product Options**
Fresh Milk – light, mild scent
Lavender – gentle floral scent
Charcoal – enhanced odor control

**How to Use**
Pour approximately 2 inches of litter into a clean litter tray.
Remove clumps and solid waste daily to maintain cleanliness.
Dispose of clumps appropriately, either by flushing in small quantities or discarding as waste.

**Important Information**
Store in a cool, dry place to preserve product quality. Vacuum packaging is used during shipping to maintain freshness; minor air leakage may occur and does not affect performance.`;

    if (isProduction) {
      // PostgreSQL
      await db.query(
        `UPDATE products SET description = $1 WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'`,
        [newDescription]
      );
    } else {
      // SQLite
      const escapedDescription = newDescription.replace(/'/g, "''");
      db.db.exec(`UPDATE products SET description = '${escapedDescription}' WHERE name = 'Lilien Premium Super Clumping Cat Litter 6L'`);
    }

    console.log('Litter product description updated successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
  }
}

// Run if called directly
if (require.main === module) {
  migrateLitterDescription().then(() => process.exit(0));
}

module.exports = migrateLitterDescription;
