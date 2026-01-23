const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  initiatePayment,
  handleMockPayment,
  handleReturn,
  handleCallback,
  queryOrderStatus,
  getConfig
} = require('../controllers/senangpayController');

// ============================================================
// SENANGPAY ROUTES
// ============================================================
// These routes handle both MOCK and REAL SenangPay modes.
// The mode is controlled by PAYMENT_MODE environment variable.
// ============================================================

// Get SenangPay configuration (public)
// Returns current mode (mock/senangpay) and payment URL
router.get('/config', getConfig);

// Initiate payment (requires auth)
// In mock mode: returns mock payment page URL
// In real mode: returns SenangPay payment URL with hash
router.post('/initiate', auth, initiatePayment);

// Query order status (requires auth)
// In mock mode: returns local database status
// In real mode: queries SenangPay API
router.get('/status/:order_id', auth, queryOrderStatus);

// ============================================================
// MOCK MODE ENDPOINTS
// ============================================================
// These endpoints simulate SenangPay behavior for development

// Process mock payment (simulates SenangPay payment processing)
router.post('/mock-process', auth, handleMockPayment);

// ============================================================
// REAL SENANGPAY ENDPOINTS
// ============================================================
// These endpoints are used by SenangPay after real integration

// Return URL - browser redirect after payment (no auth - user session may be lost)
router.get('/return', handleReturn);

// Callback URL - server-to-server notification (no auth - from SenangPay servers)
router.post('/callback', handleCallback);
router.get('/callback', handleCallback); // SenangPay may use GET as well

module.exports = router;
