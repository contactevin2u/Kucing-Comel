const crypto = require('crypto');
const db = require('../config/database');
const { sendOrderConfirmation, getOrderDetailsForEmail } = require('../services/emailService');

// ============================================================
// SENANGPAY CONFIGURATION
// ============================================================
// PAYMENT_MODE controls whether to use mock or real SenangPay:
//   - "mock"      : Simulated payments for development
//   - "senangpay" : Real SenangPay API (use after approval)
// ============================================================

const PAYMENT_MODE = process.env.PAYMENT_MODE || 'mock';
const SENANGPAY_MERCHANT_ID = process.env.SENANGPAY_MERCHANT_ID;
const SENANGPAY_SECRET_KEY = process.env.SENANGPAY_SECRET_KEY;
const SENANGPAY_BASE_URL = 'https://app.senangpay.my';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Check if we're in mock mode
const isMockMode = () => {
  return PAYMENT_MODE === 'mock' ||
         SENANGPAY_MERCHANT_ID === 'PENDING_APPROVAL' ||
         !SENANGPAY_MERCHANT_ID;
};

/**
 * Generate MD5 hash for SenangPay requests
 * Format: secret_key + detail + amount + order_id
 */
const generateRequestHash = (detail, amount, orderId) => {
  const hashString = SENANGPAY_SECRET_KEY + detail + amount + orderId;
  return crypto.createHmac('sha256', SENANGPAY_SECRET_KEY).update(hashString).digest('hex');
};

/**
 * Verify response hash from SenangPay
 * Format: secret_key + status_id + order_id + transaction_id + msg
 */
const verifyResponseHash = (statusId, orderId, transactionId, msg, receivedHash) => {
  // In mock mode, always return true
  if (isMockMode()) return true;

  const hashString = SENANGPAY_SECRET_KEY + statusId + orderId + transactionId + msg;
  const expectedHash = crypto.createHmac('sha256', SENANGPAY_SECRET_KEY).update(hashString).digest('hex');
  return expectedHash === receivedHash;
};

/**
 * Generate hash for order status query
 * Format: merchant_id + secret_key + order_id
 */
const generateQueryHash = (orderId) => {
  const hashString = SENANGPAY_MERCHANT_ID + SENANGPAY_SECRET_KEY + orderId;
  return crypto.createHash('md5').update(hashString).digest('hex');
};

/**
 * Initiate SenangPay payment
 * Supports both authenticated users and guest checkout
 */
const initiatePayment = async (req, res, next) => {
  try {
    const { order_id, guest_email } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    console.log('[SenangPay DEBUG] Initiate payment request:', {
      order_id,
      guest_email,
      has_user: !!req.user,
      user_id: req.user?.id,
      user_email: req.user?.email,
    });

    let order;

    // Check if this is a guest order or authenticated user order
    if (req.user) {
      // Authenticated user - verify order belongs to them
      const orderResult = await db.query(
        `SELECT o.*, u.name as user_name, u.email as user_email
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1 AND o.user_id = $2`,
        [order_id, req.user.id]
      );

      console.log('[SenangPay DEBUG] Order lookup result:', {
        order_id,
        user_id: req.user.id,
        rows_found: orderResult.rows.length,
      });

      if (orderResult.rows.length === 0) {
        // Debug: check if order exists at all
        const debugResult = await db.query('SELECT id, user_id, guest_email, payment_status FROM orders WHERE id = $1', [order_id]);
        console.log('[SenangPay DEBUG] Order exists check:', debugResult.rows[0] || 'NOT FOUND');
        return res.status(404).json({ error: 'Order not found.' });
      }

      order = orderResult.rows[0];
    } else {
      // Guest checkout - verify order with guest_email
      if (!guest_email) {
        return res.status(400).json({ error: 'Email is required for guest checkout.' });
      }

      const orderResult = await db.query(
        `SELECT * FROM orders WHERE id = $1 AND guest_email = $2`,
        [order_id, guest_email.toLowerCase()]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      order = orderResult.rows[0];
      order.user_email = order.guest_email;
      order.user_name = order.shipping_name;
    }

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid.' });
    }

    // Get order items for description
    const itemsResult = await db.query(
      'SELECT product_name, quantity FROM order_items WHERE order_id = $1',
      [order_id]
    );

    const orderDetails = itemsResult.rows
      .map(item => `${item.product_name} x${item.quantity}`)
      .join(', ')
      .substring(0, 95); // SenangPay detail max ~100 chars

    // Amount in ringgit with 2 decimal places (e.g. "10.50")
    const amount = parseFloat(order.total_amount).toFixed(2);

    // Generate unique order reference for SenangPay
    const senangpayOrderId = `KC-${order.id}-${Date.now()}`;

    // Store SenangPay order reference
    await db.query(
      'UPDATE orders SET payment_reference = $1, payment_method = $2 WHERE id = $3',
      [senangpayOrderId, 'senangpay', order.id]
    );

    // ============================================================
    // MOCK MODE: Return mock payment URL
    // ============================================================
    if (isMockMode()) {
      console.log('[MOCK MODE] Initiating mock payment for order:', order.id);

      return res.json({
        success: true,
        mode: 'mock',
        // In mock mode, redirect to our own mock payment page
        payment_url: `${FRONTEND_URL}/mock-payment`,
        params: {
          detail: orderDetails,
          amount: amount,
          order_id: senangpayOrderId,
          name: order.shipping_name || order.user_name,
          email: order.user_email || order.guest_email,
          phone: order.shipping_phone || '',
          // Mock hash for testing
          hash: 'mock_hash_' + senangpayOrderId
        },
        order_id: order.id,
        message: 'Mock mode - SenangPay integration pending approval'
      });
    }

    // ============================================================
    // REAL MODE: Use actual SenangPay API
    // ============================================================
    const hash = generateRequestHash(orderDetails, amount, senangpayOrderId);

    console.log('[SenangPay DEBUG] Payment initiation:', {
      merchant_id: SENANGPAY_MERCHANT_ID,
      secret_key_prefix: SENANGPAY_SECRET_KEY?.substring(0, 6) + '...',
      detail: orderDetails,
      amount,
      order_id: senangpayOrderId,
      hash,
      payment_url: `${SENANGPAY_BASE_URL}/payment/${SENANGPAY_MERCHANT_ID}`,
    });

    res.json({
      success: true,
      mode: 'senangpay',
      payment_url: `${SENANGPAY_BASE_URL}/payment/${SENANGPAY_MERCHANT_ID}`,
      params: {
        detail: orderDetails,
        amount: amount,
        order_id: senangpayOrderId,
        name: order.shipping_name || order.user_name,
        email: order.user_email || order.guest_email,
        phone: order.shipping_phone || '',
        hash: hash
      },
      order_id: order.id
    });
  } catch (error) {
    console.error('SenangPay initiate error:', error);
    next(error);
  }
};

/**
 * Handle mock payment simulation
 * This endpoint simulates what SenangPay would do
 */
const handleMockPayment = async (req, res, next) => {
  try {
    const { order_id, action } = req.body; // action: 'success' or 'fail'

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    // Extract original order ID from SenangPay order reference (KC-{id}-{timestamp})
    const originalOrderId = order_id.split('-')[1];

    // Generate mock transaction ID
    const mockTransactionId = `MOCK-TXN-${Date.now()}`;

    // Get order to check if it's a guest order
    const orderResult = await db.query('SELECT guest_email FROM orders WHERE id = $1', [originalOrderId]);
    const isGuestOrder = orderResult.rows.length > 0 && orderResult.rows[0].guest_email;

    if (action === 'success') {
      // Simulate successful payment
      await db.query(
        `UPDATE orders SET
          payment_status = 'paid',
          status = 'confirmed',
          transaction_id = $1
         WHERE id = $2`,
        [mockTransactionId, originalOrderId]
      );

      console.log(`[MOCK MODE] Order ${originalOrderId} marked as paid`);

      // Send order confirmation email
      const orderDetails = await getOrderDetailsForEmail(db, originalOrderId);
      if (orderDetails) {
        orderDetails.transactionId = mockTransactionId;
        await sendOrderConfirmation(orderDetails);
      }

      // Redirect URL depends on whether it's a guest order
      const redirectUrl = isGuestOrder
        ? `${FRONTEND_URL}/order-success?order_id=${originalOrderId}`
        : `${FRONTEND_URL}/orders?payment=success`;

      return res.json({
        success: true,
        status_id: '1',
        order_id: order_id,
        transaction_id: mockTransactionId,
        msg: 'Payment successful (MOCK)',
        redirect_url: redirectUrl,
        is_guest: isGuestOrder
      });
    } else {
      // Simulate failed payment
      await db.query(
        `UPDATE orders SET payment_status = 'failed' WHERE id = $1`,
        [originalOrderId]
      );

      console.log(`[MOCK MODE] Order ${originalOrderId} marked as failed`);

      return res.json({
        success: false,
        status_id: '0',
        order_id: order_id,
        transaction_id: null,
        msg: 'Payment failed (MOCK)',
        redirect_url: `${FRONTEND_URL}/checkout?payment=failed&msg=Mock+payment+declined`,
        is_guest: isGuestOrder
      });
    }
  } catch (error) {
    console.error('Mock payment error:', error);
    next(error);
  }
};

/**
 * Handle SenangPay return URL (browser redirect after payment)
 * This is where user lands after payment
 */
const handleReturn = async (req, res, next) => {
  try {
    const { status_id, order_id, transaction_id, msg, hash } = req.query;

    console.log('SenangPay return:', { status_id, order_id, transaction_id, msg });

    // Verify hash (skipped in mock mode)
    if (!isMockMode() && !verifyResponseHash(status_id, order_id, transaction_id, msg, hash)) {
      console.error('SenangPay return: Invalid hash');
      return res.redirect(`${FRONTEND_URL}/checkout?error=invalid_hash`);
    }

    // Extract original order ID from SenangPay order reference (KC-{id}-{timestamp})
    const originalOrderId = order_id.split('-')[1];

    // Check if this is a guest order
    const orderResult = await db.query('SELECT guest_email FROM orders WHERE id = $1', [originalOrderId]);
    const isGuestOrder = orderResult.rows.length > 0 && orderResult.rows[0].guest_email;

    // Update order status based on payment result
    if (status_id === '1') {
      // Payment successful
      await db.query(
        `UPDATE orders SET
          payment_status = 'paid',
          status = 'confirmed',
          transaction_id = $1
         WHERE id = $2`,
        [transaction_id, originalOrderId]
      );

      // Send order confirmation email
      const orderDetails = await getOrderDetailsForEmail(db, originalOrderId);
      if (orderDetails) {
        orderDetails.transactionId = transaction_id;
        await sendOrderConfirmation(orderDetails);
      }

      // Redirect to appropriate success page
      if (isGuestOrder) {
        return res.redirect(`${FRONTEND_URL}/order-success?order_id=${originalOrderId}`);
      }
      return res.redirect(`${FRONTEND_URL}/orders?payment=success`);
    } else {
      // Payment failed
      await db.query(
        `UPDATE orders SET payment_status = 'failed' WHERE id = $1`,
        [originalOrderId]
      );

      return res.redirect(`${FRONTEND_URL}/checkout?payment=failed&msg=${encodeURIComponent(msg)}`);
    }
  } catch (error) {
    console.error('SenangPay return error:', error);
    return res.redirect(`${FRONTEND_URL}/checkout?error=server_error`);
  }
};

/**
 * Handle SenangPay callback (server-to-server notification)
 * This is the webhook that ensures payment is recorded even if user closes browser
 */
const handleCallback = async (req, res, next) => {
  try {
    // SenangPay sends callback as POST with form data or query params
    const data = req.method === 'POST' ? req.body : req.query;
    const { status_id, order_id, transaction_id, msg, hash } = data;

    console.log('SenangPay callback:', { status_id, order_id, transaction_id, msg });

    // Verify hash (skipped in mock mode)
    if (!isMockMode() && !verifyResponseHash(status_id, order_id, transaction_id, msg, hash)) {
      console.error('SenangPay callback: Invalid hash');
      return res.status(400).send('Invalid hash');
    }

    // Extract original order ID from SenangPay order reference
    const originalOrderId = order_id.split('-')[1];

    if (status_id === '1') {
      // Payment successful - check if already paid to avoid duplicate emails
      const existingOrder = await db.query('SELECT payment_status FROM orders WHERE id = $1', [originalOrderId]);
      const alreadyPaid = existingOrder.rows.length > 0 && existingOrder.rows[0].payment_status === 'paid';

      await db.query(
        `UPDATE orders SET
          payment_status = 'paid',
          status = 'confirmed',
          transaction_id = $1
         WHERE id = $2 AND payment_status != 'paid'`,
        [transaction_id, originalOrderId]
      );
      console.log(`Order ${originalOrderId} marked as paid via callback`);

      // Send email only if not already paid (avoid duplicate emails)
      if (!alreadyPaid) {
        const orderDetails = await getOrderDetailsForEmail(db, originalOrderId);
        if (orderDetails) {
          orderDetails.transactionId = transaction_id;
          await sendOrderConfirmation(orderDetails);
        }
      }
    } else {
      // Payment failed
      await db.query(
        `UPDATE orders SET payment_status = 'failed' WHERE id = $1 AND payment_status = 'pending'`,
        [originalOrderId]
      );
      console.log(`Order ${originalOrderId} marked as failed via callback`);
    }

    // SenangPay requires plain "OK" response to confirm receipt
    res.set('Content-Type', 'text/plain');
    res.send('OK');
  } catch (error) {
    console.error('SenangPay callback error:', error);
    res.status(500).send('Error');
  }
};

/**
 * Query order status from SenangPay
 * Supports both authenticated users and guest orders
 */
const queryOrderStatus = async (req, res, next) => {
  try {
    const { order_id } = req.params;
    const { email } = req.query; // For guest orders

    let order;

    // Check if authenticated user or guest
    if (req.user) {
      const orderResult = await db.query(
        'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
        [order_id, req.user.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      order = orderResult.rows[0];
    } else if (email) {
      const orderResult = await db.query(
        'SELECT * FROM orders WHERE id = $1 AND guest_email = $2',
        [order_id, email.toLowerCase()]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }

      order = orderResult.rows[0];
    } else {
      return res.status(400).json({ error: 'Authentication or email required.' });
    }

    // ============================================================
    // MOCK MODE: Return local database status only
    // ============================================================
    if (isMockMode()) {
      return res.json({
        order_id: order.id,
        payment_status: order.payment_status,
        payment_method: order.payment_method || 'senangpay',
        mode: 'mock',
        message: 'Mock mode - status from local database'
      });
    }

    // ============================================================
    // REAL MODE: Query SenangPay API
    // ============================================================
    if (order.payment_reference && order.payment_method === 'senangpay') {
      const hash = generateQueryHash(order.payment_reference);

      const response = await fetch(
        `${SENANGPAY_BASE_URL}/apiv1/query_order_status?merchant_id=${SENANGPAY_MERCHANT_ID}&order_id=${order.payment_reference}&hash=${hash}`
      );

      const senangpayData = await response.json();

      return res.json({
        order_id: order.id,
        payment_status: order.payment_status,
        payment_method: 'senangpay',
        mode: 'senangpay',
        senangpay_status: senangpayData
      });
    }

    res.json({
      order_id: order.id,
      payment_status: order.payment_status,
      payment_method: order.payment_method
    });
  } catch (error) {
    console.error('Query status error:', error);
    next(error);
  }
};

/**
 * Get SenangPay configuration for frontend
 */
const getConfig = (req, res) => {
  res.json({
    merchant_id: isMockMode() ? 'MOCK_MERCHANT' : SENANGPAY_MERCHANT_ID,
    payment_url: isMockMode()
      ? `${FRONTEND_URL}/mock-payment`
      : `${SENANGPAY_BASE_URL}/payment/${SENANGPAY_MERCHANT_ID}`,
    mode: isMockMode() ? 'mock' : 'senangpay',
    is_sandbox: process.env.NODE_ENV !== 'production',
    message: isMockMode()
      ? 'Running in MOCK mode - SenangPay integration pending approval'
      : 'Running in LIVE mode - Connected to SenangPay',
    _debug_key_prefix: SENANGPAY_SECRET_KEY ? SENANGPAY_SECRET_KEY.substring(0, 8) + '...' : 'NOT SET'
  });
};

module.exports = {
  initiatePayment,
  handleMockPayment,
  handleReturn,
  handleCallback,
  queryOrderStatus,
  getConfig
};
