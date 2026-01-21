const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  createPaymentIntent,
  handleWebhook,
  getPaymentStatus
} = require('../controllers/paymentController');

router.post('/create-intent', auth, createPaymentIntent);
router.get('/status/:order_id', auth, getPaymentStatus);

module.exports = router;
