const db = require('../config/database');

const getCart = async (req, res, next) => {
  try {
    let cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      await db.query('INSERT INTO carts (user_id) VALUES ($1)', [req.user.id]);
      cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);
    }

    const cartId = cartResult.rows[0].id;

    const itemsResult = await db.query(
      `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_url, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1 AND p.is_active = true
       ORDER BY ci.created_at DESC`,
      [cartId]
    );

    const items = itemsResult.rows;
    const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

    res.json({
      cart_id: cartId,
      items,
      total: total.toFixed(2),
      item_count: items.reduce((sum, item) => sum + item.quantity, 0)
    });
  } catch (error) {
    next(error);
  }
};

const addToCart = async (req, res, next) => {
  try {
    const { product_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }

    const productResult = await db.query(
      'SELECT id, stock FROM products WHERE id = $1 AND is_active = true',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const product = productResult.rows[0];
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Not enough stock available.' });
    }

    let cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      cartResult = await db.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [req.user.id]
      );
    }

    const cartId = cartResult.rows[0].id;

    const existingItem = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2',
      [cartId, product_id]
    );

    if (existingItem.rows.length > 0) {
      const newQuantity = existingItem.rows[0].quantity + quantity;
      if (newQuantity > product.stock) {
        return res.status(400).json({ error: 'Not enough stock available.' });
      }
      await db.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
        [newQuantity, existingItem.rows[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity) VALUES ($1, $2, $3)',
        [cartId, product_id, quantity]
      );
    }

    const updatedCart = await getCartData(req.user.id);
    res.json({ message: 'Item added to cart.', ...updatedCart });
  } catch (error) {
    next(error);
  }
};

const updateCartItem = async (req, res, next) => {
  try {
    const { item_id, quantity } = req.body;

    if (!item_id || quantity === undefined) {
      return res.status(400).json({ error: 'Item ID and quantity are required.' });
    }

    const cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found.' });
    }

    const cartId = cartResult.rows[0].id;

    const itemResult = await db.query(
      `SELECT ci.id, ci.product_id, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.id = $1 AND ci.cart_id = $2`,
      [item_id, cartId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    if (quantity <= 0) {
      await db.query('DELETE FROM cart_items WHERE id = $1', [item_id]);
    } else {
      if (quantity > itemResult.rows[0].stock) {
        return res.status(400).json({ error: 'Not enough stock available.' });
      }
      await db.query('UPDATE cart_items SET quantity = $1 WHERE id = $2', [quantity, item_id]);
    }

    const updatedCart = await getCartData(req.user.id);
    res.json({ message: 'Cart updated.', ...updatedCart });
  } catch (error) {
    next(error);
  }
};

const removeFromCart = async (req, res, next) => {
  try {
    const { itemId } = req.params;

    const cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart not found.' });
    }

    const result = await db.query(
      'DELETE FROM cart_items WHERE id = $1 AND cart_id = $2 RETURNING id',
      [itemId, cartResult.rows[0].id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    const updatedCart = await getCartData(req.user.id);
    res.json({ message: 'Item removed from cart.', ...updatedCart });
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length > 0) {
      await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartResult.rows[0].id]);
    }

    res.json({ message: 'Cart cleared.', items: [], total: '0.00', item_count: 0 });
  } catch (error) {
    next(error);
  }
};

async function getCartData(userId) {
  const cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [userId]);

  if (cartResult.rows.length === 0) {
    return { cart_id: null, items: [], total: '0.00', item_count: 0 };
  }

  const cartId = cartResult.rows[0].id;

  const itemsResult = await db.query(
    `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.image_url, p.stock
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     WHERE ci.cart_id = $1 AND p.is_active = true
     ORDER BY ci.created_at DESC`,
    [cartId]
  );

  const items = itemsResult.rows;
  const total = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);

  return {
    cart_id: cartId,
    items,
    total: total.toFixed(2),
    item_count: items.reduce((sum, item) => sum + item.quantity, 0)
  };
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
};
