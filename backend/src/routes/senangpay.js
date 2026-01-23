const express = require('express');
const router = express.Router();
const { auth, optionalAuth } = require('../middleware/auth');
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
// Supports both authenticated users and guest checkout.
// ============================================================

// Get SenangPay configuration (public)
// Returns current mode (mock/senangpay) and payment URL
router.get('/config', getConfig);

// Initiate payment (supports both auth and guest)
// For guests: pass guest_email in request body
router.post('/initiate', optionalAuth, initiatePayment);

// Query order status (supports both auth and guest)
// For guests: pass email as query parameter
router.get('/status/:order_id', optionalAuth, queryOrderStatus);

// ============================================================
// MOCK MODE ENDPOINTS
// ============================================================
// These endpoints simulate SenangPay behavior for development

// Process mock payment (no auth - accessible from mock payment page)
router.post('/mock-process', handleMockPayment);

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
