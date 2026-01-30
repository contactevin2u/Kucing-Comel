require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const { handleWebhook } = require('./controllers/paymentController');
const initializeDatabase = require('./db/init');

const path = require('path');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const senangpayRoutes = require('./routes/senangpay');
const variantImagesRoutes = require('./routes/variantImages');
const wishlistRoutes = require('./routes/wishlist');
const addressRoutes = require('./routes/addresses');

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

// Serve static product images from Products folder
const productsPath = path.join(__dirname, '..', '..', 'Products');
app.use('/api/product-images', express.static(productsPath));

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
    // Add member_price column if it doesn't exist (SQLite compatible)
    try {
      await db.query(`ALTER TABLE products ADD COLUMN member_price DECIMAL(10, 2)`);
    } catch (e) {
      // Column already exists, ignore error
    }

    // Delete existing products and variants
    await db.query(`DELETE FROM product_variants`);
    await db.query(`DELETE FROM products`);

    // Insert 6L litter products (one per scent)
    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Lilien Premium Super Clumping Cat Litter 6L - Charcoal', 'Premium quality super clumping cat litter.', 7.60, 6.84, '/Lilien Premium Super Clumping Cat Litter 6L/Charcoal/1.jfif', 'Litter', 80]);
    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Lilien Premium Super Clumping Cat Litter 6L - Fresh Milk', 'Premium quality super clumping cat litter.', 7.60, 6.84, '/Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk/1.jfif', 'Litter', 60]);
    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Lilien Premium Super Clumping Cat Litter 6L - Lavender', 'Premium quality super clumping cat litter.', 7.60, 6.84, '/Lilien Premium Super Clumping Cat Litter 6L/Lavender/1.jfif', 'Litter', 60]);

    // Insert carton litter products (one per scent)
    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Charcoal', 'Bulk pack of 6 bags.', 159.00, 143.10, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Charcoal/1.jfif', 'Litter', 20]);
    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Fresh Milk', 'Bulk pack of 6 bags.', 159.00, 143.10, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk/1.jfif', 'Litter', 15]);
    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L - Lavender', 'Bulk pack of 6 bags.', 159.00, 143.10, '/[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Lavender/1.jfif', 'Litter', 15]);

    // Insert treats product
    const product7 = await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      ['Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats!', 42.00, 37.80, '/Lilien Creamy Cat Treats 3 Irresistible Flavour In a Box/my-11134207-7r98s-lsumaj6h2ign1f.jfif', 'Food', 300]);

    // Treats variants only
    const p7Id = product7.rows[0].id;
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p7Id, 'Chicken', 14.00, 12.60, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p7Id, 'Tuna', 14.00, 12.60, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p7Id, 'Salmon', 14.00, 12.60, 100]);
    await db.query(`INSERT INTO product_variants (product_id, variant_name, price, member_price, stock) VALUES ($1, $2, $3, $4, $5)`, [p7Id, 'Mixed (3 Flavours Box)', 42.00, 37.80, 50]);

    res.json({ success: true, message: 'Products reseeded with 7 products (6 litter + 1 treats)!' });
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
app.use('/api/variant-images', variantImagesRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/addresses', addressRoutes);

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
