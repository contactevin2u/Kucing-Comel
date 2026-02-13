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
      `SELECT ci.id, ci.quantity, ci.variant_id,
              p.id as product_id, p.name, p.price, p.member_price, p.image_url, p.stock, p.weight,
              (p.image_data IS NOT NULL) AS has_db_image,
              (SELECT pi.id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS primary_image_id,
              pv.variant_name, pv.price as variant_price, pv.member_price as variant_member_price, pv.stock as variant_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.cart_id = $1 AND p.is_active = true
       ORDER BY ci.created_at DESC`,
      [cartId]
    );

    // Format items with variant info and member pricing
    const items = itemsResult.rows.map(item => {
      const useVariantPrice = item.variant_id && item.variant_price;
      const price = useVariantPrice ? item.variant_price : item.price;
      const memberPrice = useVariantPrice ? item.variant_member_price : item.member_price;
      const stock = useVariantPrice ? item.variant_stock : item.stock;

      return {
        id: item.id,
        quantity: item.quantity,
        product_id: item.product_id,
        variant_id: item.variant_id,
        name: item.name,
        variant_name: item.variant_name,
        price: memberPrice || price, // Use member price if available (user is logged in)
        original_price: price,
        image_url: item.image_url,
        has_db_image: item.has_db_image === true || item.has_db_image === 1,
        primary_image_id: item.primary_image_id || null,
        stock: stock,
        weight: parseFloat(item.weight) || 0
      };
    });

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
    const { product_id, variant_id, quantity = 1 } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required.' });
    }

    if (quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1.' });
    }

    // Check if product exists
    const productResult = await db.query(
      'SELECT id, stock FROM products WHERE id = $1 AND is_active = true',
      [product_id]
    );

    if (productResult.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if product has variants - if so, variant_id is required
    const variantsCheck = await db.query(
      'SELECT COUNT(*) as count FROM product_variants WHERE product_id = $1 AND is_active = true',
      [product_id]
    );

    const hasVariants = parseInt(variantsCheck.rows[0].count) > 0;

    if (hasVariants && !variant_id) {
      return res.status(400).json({ error: 'Please select a product variation' });
    }

    // Determine stock to check (variant stock or product stock)
    let availableStock = productResult.rows[0].stock;

    // If variant_id provided, validate and use variant stock
    if (variant_id) {
      const variantResult = await db.query(
        'SELECT id, stock FROM product_variants WHERE id = $1 AND product_id = $2 AND is_active = true',
        [variant_id, product_id]
      );

      if (variantResult.rows.length === 0) {
        return res.status(404).json({ error: 'Product variant not found.' });
      }
      availableStock = variantResult.rows[0].stock;
    }

    if (availableStock < quantity) {
      return res.status(400).json({ error: 'Not enough stock available.' });
    }

    // Get or create cart
    let cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      cartResult = await db.query(
        'INSERT INTO carts (user_id) VALUES ($1) RETURNING id',
        [req.user.id]
      );
    }

    const cartId = cartResult.rows[0].id;

    // Check for existing item with same product and variant
    const existingItemQuery = variant_id
      ? 'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id = $3'
      : 'SELECT id, quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 AND variant_id IS NULL';

    const existingItemParams = variant_id
      ? [cartId, product_id, variant_id]
      : [cartId, product_id];

    const existingItem = await db.query(existingItemQuery, existingItemParams);

    if (existingItem.rows.length > 0) {
      const newQuantity = existingItem.rows[0].quantity + quantity;
      if (newQuantity > availableStock) {
        return res.status(400).json({ error: 'Not enough stock available.' });
      }
      await db.query(
        'UPDATE cart_items SET quantity = $1 WHERE id = $2',
        [newQuantity, existingItem.rows[0].id]
      );
    } else {
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, variant_id, quantity) VALUES ($1, $2, $3, $4)',
        [cartId, product_id, variant_id || null, quantity]
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
      `SELECT ci.id, ci.product_id, ci.variant_id, p.stock,
              pv.stock as variant_stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.id = $1 AND ci.cart_id = $2`,
      [item_id, cartId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Cart item not found.' });
    }

    const item = itemResult.rows[0];
    const availableStock = item.variant_id ? item.variant_stock : item.stock;

    if (quantity <= 0) {
      await db.query('DELETE FROM cart_items WHERE id = $1', [item_id]);
    } else {
      if (quantity > availableStock) {
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
    `SELECT ci.id, ci.quantity, ci.variant_id,
            p.id as product_id, p.name, p.price, p.member_price, p.image_url, p.stock, p.weight,
            (p.image_data IS NOT NULL) AS has_db_image,
            (SELECT pi.id FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order ASC LIMIT 1) AS primary_image_id,
            pv.variant_name, pv.price as variant_price, pv.member_price as variant_member_price, pv.stock as variant_stock
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     LEFT JOIN product_variants pv ON ci.variant_id = pv.id
     WHERE ci.cart_id = $1 AND p.is_active = true
     ORDER BY ci.created_at DESC`,
    [cartId]
  );

  const items = itemsResult.rows.map(item => {
    const useVariantPrice = item.variant_id && item.variant_price;
    const price = useVariantPrice ? item.variant_price : item.price;
    const memberPrice = useVariantPrice ? item.variant_member_price : item.member_price;
    const stock = useVariantPrice ? item.variant_stock : item.stock;

    return {
      id: item.id,
      quantity: item.quantity,
      product_id: item.product_id,
      variant_id: item.variant_id,
      name: item.name,
      variant_name: item.variant_name,
      price: memberPrice || price,
      original_price: price,
      image_url: item.image_url,
      has_db_image: item.has_db_image === true || item.has_db_image === 1,
      primary_image_id: item.primary_image_id || null,
      stock: stock,
      weight: parseFloat(item.weight) || 0
    };
  });

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
