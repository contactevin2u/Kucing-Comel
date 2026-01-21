const db = require('../config/database');

const getOrders = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT o.*,
        (SELECT json_agg(json_build_object(
          'id', oi.id,
          'product_id', oi.product_id,
          'product_name', oi.product_name,
          'product_price', oi.product_price,
          'quantity', oi.quantity
        )) FROM order_items oi WHERE oi.order_id = o.id) as items
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC`,
      [req.user.id]
    );

    res.json({ orders: result.rows });
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

const createOrder = async (req, res, next) => {
  const client = await db.pool.connect();

  try {
    await client.query('BEGIN');

    const { shipping_name, shipping_address, shipping_phone } = req.body;

    if (!shipping_name || !shipping_address || !shipping_phone) {
      return res.status(400).json({ error: 'Shipping details are required.' });
    }

    const cartResult = await client.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart not found.' });
    }

    const cartId = cartResult.rows[0].id;

    const itemsResult = await client.query(
      `SELECT ci.id, ci.quantity, p.id as product_id, p.name, p.price, p.stock
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.cart_id = $1 AND p.is_active = true`,
      [cartId]
    );

    if (itemsResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }

    for (const item of itemsResult.rows) {
      if (item.quantity > item.stock) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Not enough stock for ${item.name}. Available: ${item.stock}`
        });
      }
    }

    const totalAmount = itemsResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    const orderResult = await client.query(
      `INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, totalAmount, shipping_name, shipping_address, shipping_phone]
    );

    const order = orderResult.rows[0];

    for (const item of itemsResult.rows) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
         VALUES ($1, $2, $3, $4, $5)`,
        [order.id, item.product_id, item.name, item.price, item.quantity]
      );

      await client.query(
        'UPDATE products SET stock = stock - $1 WHERE id = $2',
        [item.quantity, item.product_id]
      );
    }

    await client.query('DELETE FROM cart_items WHERE cart_id = $1', [cartId]);

    await client.query('COMMIT');

    const finalItemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [order.id]
    );

    res.status(201).json({
      message: 'Order created successfully.',
      order: {
        ...order,
        items: finalItemsResult.rows
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
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

    const result = await db.query(
      'UPDATE orders SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );

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
  createOrder,
  updateOrderStatus
};
