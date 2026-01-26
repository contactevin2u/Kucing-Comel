const db = require('../config/database');

/**
 * Get user's wishlist
 */
const getWishlist = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT w.id, w.product_id, w.created_at,
              p.name, p.price, p.member_price, p.image_url, p.category
       FROM wishlist w
       JOIN products p ON w.product_id = p.id
       WHERE w.user_id = $1
       ORDER BY w.created_at DESC`,
      [req.user.id]
    );

    res.json({ wishlist: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Add product to wishlist
 */
const addToWishlist = async (req, res, next) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    // Check if product exists
    const productResult = await db.query(
      'SELECT id FROM products WHERE id = $1',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if already in wishlist
    const existingResult = await db.query(
      'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [req.user.id, product_id]
    );

    if (existingResult.rows.length > 0) {
      return res.status(400).json({ error: 'Product already in wishlist.' });
    }

    // Add to wishlist
    const result = await db.query(
      `INSERT INTO wishlist (user_id, product_id) VALUES ($1, $2) RETURNING id`,
      [req.user.id, product_id]
    );

    res.status(201).json({
      message: 'Product added to wishlist.',
      wishlist_id: result.rows[0].id
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove product from wishlist
 */
const removeFromWishlist = async (req, res, next) => {
  try {
    const { product_id } = req.params;

    const result = await db.query(
      'DELETE FROM wishlist WHERE user_id = $1 AND product_id = $2 RETURNING id',
      [req.user.id, product_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not in wishlist.' });
    }

    res.json({ message: 'Product removed from wishlist.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Check if product is in wishlist
 */
const checkWishlist = async (req, res, next) => {
  try {
    const { product_id } = req.params;

    const result = await db.query(
      'SELECT id FROM wishlist WHERE user_id = $1 AND product_id = $2',
      [req.user.id, product_id]
    );

    res.json({ inWishlist: result.rows.length > 0 });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist
};
