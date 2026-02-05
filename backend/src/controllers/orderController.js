const db = require('../config/database');
const { incrementVoucherUsage } = require('./voucherController');

const getOrders = async (req, res, next) => {
  try {
    const ordersResult = await db.query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Get items for each order
    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await db.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      );
      orders.push({
        ...order,
        items: itemsResult.rows
      });
    }

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const itemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    res.json({
      order: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get order by ID for guest (using email verification)
const getGuestOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email is required to view guest order.' });
    }

    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND guest_email = $2',
      [id, email.toLowerCase()]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const itemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [id]
    );

    res.json({
      order: {
        ...orderResult.rows[0],
        items: itemsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

const createOrder = async (req, res, next) => {
  try {
    const { shipping_name, shipping_address, shipping_phone, voucher_code, voucher_discount } = req.body;

    if (!shipping_name || !shipping_address || !shipping_phone) {
      return res.status(400).json({ error: 'Shipping details are required.' });
    }

    const cartResult = await db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart not found.' });
    }

    const cartId = cartResult.rows[0].id;

    const itemsResult = await db.query(
      `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1 AND p.is_active = true`,
      [cartId]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    // Check stock
    for (const item of itemsResult.rows) {
      if (item.quantity > item.stock) {
        return res.status(400).json({
          error: `Not enough stock for ${item.name}. Available: ${item.stock}`
        });
      }
    }

    const subtotal = itemsResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    // Validate and apply voucher if provided
    let appliedVoucherCode = null;
    let appliedVoucherDiscount = 0;
    let voucherId = null;

    // Get user email for voucher tracking
    const userEmailResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const userEmail = userEmailResult.rows[0]?.email;

    if (voucher_code) {
      const voucherResult = await db.query(
        `SELECT * FROM vouchers WHERE LOWER(code) = LOWER($1)`,
        [voucher_code.trim()]
      );

      if (voucherResult.rows.length > 0) {
        const voucher = voucherResult.rows[0];
        const now = new Date();

        // Check per-user usage
        const usageResult = await db.query(
          `SELECT id FROM voucher_usage WHERE voucher_id = $1 AND LOWER(user_email) = LOWER($2)`,
          [voucher.id, userEmail]
        );
        const alreadyUsed = usageResult.rows.length > 0;

        // Validate voucher
        if (voucher.is_active &&
            !alreadyUsed &&
            (!voucher.start_date || new Date(voucher.start_date) <= now) &&
            (!voucher.expiry_date || new Date(voucher.expiry_date) >= now) &&
            (voucher.usage_limit === null || voucher.times_used < voucher.usage_limit) &&
            (!voucher.min_order_amount || subtotal >= parseFloat(voucher.min_order_amount))) {

          // Calculate discount
          if (voucher.discount_type === 'fixed') {
            appliedVoucherDiscount = parseFloat(voucher.discount_amount);
          } else {
            appliedVoucherDiscount = (subtotal * parseFloat(voucher.discount_amount)) / 100;
            if (voucher.max_discount && appliedVoucherDiscount > parseFloat(voucher.max_discount)) {
              appliedVoucherDiscount = parseFloat(voucher.max_discount);
            }
          }

          // Discount cannot exceed subtotal
          if (appliedVoucherDiscount > subtotal) {
            appliedVoucherDiscount = subtotal;
          }

          appliedVoucherCode = voucher.code;
          voucherId = voucher.id;
        }
      }
    }

    const totalAmount = subtotal - appliedVoucherDiscount;

    // Create order
    const orderResult = await db.query(
      `INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_phone, voucher_code, voucher_discount)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [req.user.id, totalAmount, shipping_name, shipping_address, shipping_phone, appliedVoucherCode, appliedVoucherDiscount]
    );
    const orderId = orderResult.rows[0].id;

    // Increment voucher usage if voucher was applied
    if (voucherId) {
      await incrementVoucherUsage(voucherId, userEmail, orderId);
    }

    // Create order items and update stock
    for (const item of itemsResult.rows) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.name, item.price, item.quantity]
      );
      await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Clear cart
    await db.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    // Get the created order
    const finalOrderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const finalItemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

    res.status(201).json({
      message: 'Order created successfully.',
      order: {
        ...finalOrderResult.rows[0],
        items: finalItemsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create guest order - allows checkout without login
 * Accepts cart items directly instead of from database cart
 */
const createGuestOrder = async (req, res, next) => {
  try {
    const {
      shipping_name,
      shipping_address,
      shipping_phone,
      guest_email,
      items, // Array of { product_id, quantity, variant_id? }
      voucher_code
    } = req.body;

    // Validate required fields
    if (!shipping_name || !shipping_address || !shipping_phone) {
      return res.status(400).json({ error: 'Shipping details are required.' });
    }

    if (!guest_email) {
      return res.status(400).json({ error: 'Email is required for guest checkout.' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart items are required.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guest_email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Get product details and validate stock
    const productIds = items.map(item => item.product_id);
    const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');

    const productsResult = await db.query(
      `SELECT id, name, price, stock, is_active FROM products WHERE id IN (${placeholders})`,
      productIds
    );

    const productsMap = {};
    for (const product of productsResult.rows) {
      productsMap[product.id] = product;
    }

    // Validate all products exist and have stock
    const orderItems = [];
    for (const item of items) {
      const product = productsMap[item.product_id];

      if (!product) {
        return res.status(400).json({ error: `Product with ID ${item.product_id} not found.` });
      }

      if (!product.is_active) {
        return res.status(400).json({ error: `${product.name} is no longer available.` });
      }

      if (item.quantity > product.stock) {
        return res.status(400).json({
          error: `Not enough stock for ${product.name}. Available: ${product.stock}`
        });
      }

      orderItems.push({
        product_id: product.id,
        name: product.name,
        price: parseFloat(product.price),
        quantity: item.quantity
      });
    }

    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Validate and apply voucher if provided
    let appliedVoucherCode = null;
    let appliedVoucherDiscount = 0;
    let voucherId = null;

    if (voucher_code) {
      const voucherResult = await db.query(
        `SELECT * FROM vouchers WHERE LOWER(code) = LOWER($1)`,
        [voucher_code.trim()]
      );

      if (voucherResult.rows.length > 0) {
        const voucher = voucherResult.rows[0];
        const now = new Date();

        // Check per-user usage
        const usageResult = await db.query(
          `SELECT id FROM voucher_usage WHERE voucher_id = $1 AND LOWER(user_email) = LOWER($2)`,
          [voucher.id, guest_email]
        );
        const alreadyUsed = usageResult.rows.length > 0;

        // Validate voucher
        if (voucher.is_active &&
            !alreadyUsed &&
            (!voucher.start_date || new Date(voucher.start_date) <= now) &&
            (!voucher.expiry_date || new Date(voucher.expiry_date) >= now) &&
            (voucher.usage_limit === null || voucher.times_used < voucher.usage_limit) &&
            (!voucher.min_order_amount || subtotal >= parseFloat(voucher.min_order_amount))) {

          // Calculate discount
          if (voucher.discount_type === 'fixed') {
            appliedVoucherDiscount = parseFloat(voucher.discount_amount);
          } else {
            appliedVoucherDiscount = (subtotal * parseFloat(voucher.discount_amount)) / 100;
            if (voucher.max_discount && appliedVoucherDiscount > parseFloat(voucher.max_discount)) {
              appliedVoucherDiscount = parseFloat(voucher.max_discount);
            }
          }

          // Discount cannot exceed subtotal
          if (appliedVoucherDiscount > subtotal) {
            appliedVoucherDiscount = subtotal;
          }

          appliedVoucherCode = voucher.code;
          voucherId = voucher.id;
        }
      }
    }

    const totalAmount = subtotal - appliedVoucherDiscount;

    // Create order (user_id is NULL for guest)
    const orderResult = await db.query(
      `INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_phone, guest_email, voucher_code, voucher_discount)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [null, totalAmount, shipping_name, shipping_address, shipping_phone, guest_email.toLowerCase(), appliedVoucherCode, appliedVoucherDiscount]
    );
    const orderId = orderResult.rows[0].id;

    // Increment voucher usage if voucher was applied
    if (voucherId) {
      await incrementVoucherUsage(voucherId, guest_email, orderId);
    }

    // Create order items and update stock
    for (const item of orderItems) {
      await db.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [orderId, item.product_id, item.name, item.price, item.quantity]
      );
      await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.product_id]);
    }

    // Get the created order
    const finalOrderResult = await db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const finalItemsResult = await db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

    res.status(201).json({
      message: 'Order created successfully.',
      order: {
        ...finalOrderResult.rows[0],
        items: finalItemsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
};

const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status.' });
    }

    await db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);

    const result = await db.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    res.json({ order: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getOrders,
  getOrderById,
  getGuestOrderById,
  createOrder,
  createGuestOrder,
  updateOrderStatus
};
