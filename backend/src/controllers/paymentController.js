const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../config/database');

const createPaymentIntent = async (req, res, next) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required.' });
    }

    const orderResult = await db.query(
      'SELECT * FROM orders WHERE id = $1 AND user_id = $2',
      [order_id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    if (order.payment_status === 'paid') {
      return res.status(400).json({ error: 'Order is already paid.' });
    }

    const amountInCents = Math.round(parseFloat(order.total_amount) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: 'myr',
      metadata: {
        order_id: order.id.toString(),
        user_id: req.user.id.toString()
      },
      automatic_payment_methods: {
        enabled: true
      }
    });

    await db.query(
      'UPDATE orders SET payment_intent_id = $1 WHERE id = $2',
      [paymentIntent.id, order.id]
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: order.total_amount
    });
  } catch (error) {
    console.error('Stripe error:', error);
    next(error);
  }
};

const handleWebhook = async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed.' });
  }
};

async function handlePaymentSuccess(paymentIntent) {
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    console.error('No order_id in payment intent metadata');
    return;
  }

  await db.query(
    `UPDATE orders SET payment_status = 'paid', status = 'confirmed' WHERE id = $1`,
    [orderId]
  );

  console.log(`Order ${orderId} marked as paid.`);
}

async function handlePaymentFailed(paymentIntent) {
  const orderId = paymentIntent.metadata.order_id;

  if (!orderId) {
    console.error('No order_id in payment intent metadata');
    return;
  }

  await db.query(
    `UPDATE orders SET payment_status = 'failed' WHERE id = $1`,
    [orderId]
  );

  console.log(`Order ${orderId} payment failed.`);
}

const getPaymentStatus = async (req, res, next) => {
  try {
    const { order_id } = req.params;

    const orderResult = await db.query(
      'SELECT id, payment_status, payment_intent_id FROM orders WHERE id = $1 AND user_id = $2',
      [order_id, req.user.id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    if (order.payment_intent_id) {
      const paymentIntent = await stripe.paymentIntents.retrieve(order.payment_intent_id);
      return res.json({
        order_id: order.id,
        payment_status: order.payment_status,
        stripe_status: paymentIntent.status
      });
    }

    res.json({
      order_id: order.id,
      payment_status: order.payment_status
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPaymentIntent,
  handleWebhook,
  getPaymentStatus
};
