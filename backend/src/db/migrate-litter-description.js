const db = require('../config/database');

async function migrateLitterDescription() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    console.log('Updating litter product description...');

    const newDescription = `Flushable & Eco-Friendly
Produced using biodegradable, plant-based materials, this litter is non-toxic and safe for daily use. Clumps may be disposed of by flushing in small amounts, offering a convenient and environmentally conscious disposal option.

Product Options
Fresh Milk – light, mild scent
Lavender – gentle floral scent
Charcoal – enhanced odor control

How to Use
Pour approximately 2 inches of litter into a clean litter tray.
Remove clumps and solid waste daily to maintain cleanliness.
Dispose of clumps appropriately, either by flushing in small quantities or discarding as waste.

Important Information
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
