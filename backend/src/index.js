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
    version: '1.0.7',
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

    await db.query(`DELETE FROM products`);

    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Lilien Premium Super Clumping Cat Litter 6L', 'Premium quality super clumping cat litter.', 7.60, 6.84, '/products/litter-6l.jpg', 'Litter', 200]);

    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L', 'Bulk pack of 6 bags.', 139.90, 119.90, '/products/litter-carton.jpg', 'Litter', 50]);

    await db.query(`INSERT INTO products (name, description, price, member_price, image_url, category, stock) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      ['Lilien Creamy Cat Treats - 3 Flavours Box', 'Irresistible creamy cat treats!', 18.90, 15.90, '/products/creamy-treats.jpg', 'Food', 300]);

    res.json({ success: true, message: 'Products reseeded!' });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

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
