require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { handleWebhook } = require('./controllers/paymentController');
const initializeDatabase = require('./db/init');

const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const senangpayRoutes = require('./routes/senangpay');

const app = express();
const PORT = process.env.PORT || 5000;

// Build allowed origins - handle FRONTEND_URL that might be hostname only
const getFrontendOrigin = () => {
  const url = process.env.FRONTEND_URL;
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const allowedOrigins = [
  getFrontendOrigin(),
  'https://kucing-comel-frontend.onrender.com',
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), handleWebhook);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root welcome route
app.get('/', (req, res) => {
  res.json({
    name: 'Kucing Comel API',
    version: '1.0.10',
    endpoints: {
      health: '/api/health',
      products: '/api/products',
      categories: '/api/products/categories'
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual reseed endpoint for debugging
const db = require('./config/database');
app.get('/api/reseed', async (req, res) => {
  try {
    // Add member_price column if it doesn't exist
    await db.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS member_price DECIMAL(10, 2)`);

    // Delete existing products and variants
    await db.query(`DELETE FROM product_variants`);
    await db.query(`DELETE FROM products`);

    // Insert products
    const product1 = await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter.', 7.60, 6.84, '/products/litter-6l.jpg', 'Litter', 200]);

    const product2 = await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags.', 159.00, 143.10, '/products/litter-carton.jpg', 'Litter', 50]);

    const product3 = await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats!', 42.00, 37.80, '/products/creamy-treats.jpg', 'Food', 300]);

    const product4 = await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['CARE FIP GS-441524 For Cats FIP Kucing', 'Cat Wellness & Support Solution. Specialised cat care product intended to support overall wellness and quality of life during recovery periods. Widely used by experienced caregivers as part of a guided care plan for cats requiring additional support. Designed for careful, responsible use. Supports treatment for Wet, Dry, Neuro & Ocular FIP. High recovery success rate when used consistently. Helps improve appetite, energy & overall condition. Trusted by veterinarians & experienced caregivers.', 123.50, 111.15, '/products/care-fip.jpg', 'Supplements & Medications', 100]);

    // Insert variants for each product
    const p1Id = product1.rows[0].id;
    const p2Id = product2.rows[0].id;
    const p3Id = product3.rows[0].id;
    const p4Id = product4.rows[0].id;

    // Litter 6L variants
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p1Id, 'Original', 7.60, 6.84, 80]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p1Id, 'Lavender', 8.00, 7.20, 60]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p1Id, 'Green Tea', 8.00, 7.20, 60]);

    // Carton variants
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p2Id, 'Original', 159.00, 143.10, 20]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p2Id, 'Lavender', 168.00, 151.20, 15]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p2Id, 'Green Tea', 168.00, 151.20, 15]);

    // Treats variants
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p3Id, 'Chicken', 14.00, 12.60, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p3Id, 'Tuna', 14.00, 12.60, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p3Id, 'Salmon', 14.00, 12.60, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p3Id, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50]);

    // CARE FIP variants
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p4Id, '20mg | 8.5ml', 123.50, 111.15, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p4Id, '20mg | 30ml', 390.00, 351.00, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p4Id, '20mg | 50ml', 624.00, 561.60, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p4Id, '30mg | 8.5ml', 136.50, 122.85, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p4Id, '30mg | 30ml', 429.00, 386.10, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p4Id, '30mg | 50ml', 650.00, 585.00, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p4Id, '75mg | 10 Tabs', 195.00, 175.50, 100]);

    res.json({ success: true, message: 'Products reseeded with 4 products and all variants!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/senangpay', senangpayRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use(errorHandler);

// Bind to 0.0.0.0 for Render
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  // Auto-initialize database on startup (non-blocking)
  initializeDatabase().catch(err => {
    console.error('Database initialization error:', err.message);
  });
});

module.exports = app;
