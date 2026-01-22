const db = require('../config/database');

const getOrders = async (req, res, next) => {
  try {
    const ordersResult = db.query(
      `SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Get items for each order
    const orders = ordersResult.rows.map(order => {
      const itemsResult = db.query(
        'SELECT * FROM order_items WHERE order_id = $1',
        [order.id]
      );
      return {
        ...order,
        items: itemsResult.rows
      };
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderResult = db.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const itemsResult = db.query(
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
    const { shipping_name, shipping_address, shipping_phone } = req.body;

    if (!shipping_name || !shipping_address || !shipping_phone) {
      return res.status(400).json({ error: 'Shipping details are required.' });
    }

    const cartResult = db.query('SELECT id FROM carts WHERE user_id = $1', [req.user.id]);

    if (cartResult.rows.length === 0) {
      return res.status(400).json({ error: 'Cart not found.' });
    }

    const cartId = cartResult.rows[0].id;

    const itemsResult = db.query(
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

    const totalAmount = itemsResult.rows.reduce(
      (sum, item) => sum + parseFloat(item.price) * item.quantity,
      0
    );

    // Use SQLite transaction
    const transaction = db.db.transaction(() => {
      // Create order
      const orderStmt = db.db.prepare(
        `INSERT INTO orders (user_id, total_amount, shipping_name, shipping_address, shipping_phone)
         VALUES (?, ?, ?, ?, ?)`
      );
      const orderInfo = orderStmt.run(req.user.id, totalAmount, shipping_name, shipping_address, shipping_phone);
      const orderId = orderInfo.lastInsertRowid;

      // Create order items and update stock
      const insertItemStmt = db.db.prepare(
        `INSERT INTO order_items (order_id, product_id, product_name, product_price, quantity)
         VALUES (?, ?, ?, ?, ?)`
      );
      const updateStockStmt = db.db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?');

      for (const item of itemsResult.rows) {
        insertItemStmt.run(orderId, item.product_id, item.name, item.price, item.quantity);
        updateStockStmt.run(item.quantity, item.product_id);
      }

      // Clear cart
      const clearCartStmt = db.db.prepare('DELETE FROM cart_items WHERE cart_id = ?');
      clearCartStmt.run(cartId);

      return orderId;
    });

    const orderId = transaction();

    // Get the created order
    const orderResult = db.query('SELECT * FROM orders WHERE id = $1', [orderId]);
    const finalItemsResult = db.query('SELECT * FROM order_items WHERE order_id = $1', [orderId]);

    res.status(201).json({
      message: 'Order created successfully.',
      order: {
        ...orderResult.rows[0],
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

    db.query('UPDATE orders SET status = $1 WHERE id = $2', [status, id]);

    const result = db.query('SELECT * FROM orders WHERE id = $1', [id]);

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
