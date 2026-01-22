const db = require('../config/database');

// Helper function to format product based on user authentication
const formatProduct = (product, isMember) => {
  if (isMember) {
    // Logged-in member: show member price as main price, original price for reference
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      price: product.member_price || product.price,
      originalPrice: product.price,
      isMember: true
    };
  } else {
    // Guest: show only normal price, no member price exposed
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      category: product.category,
      stock: product.stock,
      price: product.price,
      isMember: false
    };
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const { category, search, sort, limit = 50, offset = 0 } = req.query;
    const isMember = !!req.user;

    let query = 'SELECT * FROM products WHERE is_active = true';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (search) {
      paramCount++;
      query += ` AND (LOWER(name) LIKE LOWER($${paramCount}) OR LOWER(description) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'newest') {
      query += ' ORDER BY created_at DESC';
    } else {
      query += ' ORDER BY id ASC';
    }

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(query, params);

    const countQuery = 'SELECT COUNT(*) FROM products WHERE is_active = true';
    const countResult = await db.query(countQuery);

    // Format products based on member status
    const products = result.rows.map(product => formatProduct(product, isMember));

    res.json({
      products,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
      isMember
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isMember = !!req.user;

    const result = await db.query('SELECT * FROM products WHERE id = $1 AND is_active = true', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({ product: formatProduct(result.rows[0], isMember) });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM products WHERE is_active = true AND category IS NOT NULL ORDER BY category'
    );

    res.json({ categories: result.rows.map(row => row.category) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getCategories
};
