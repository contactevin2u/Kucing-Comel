const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getOrders,
  getOrderById,
  getGuestOrderById,
  createOrder,
  createGuestOrder
} = require('../controllers/orderController');

// Authenticated user orders
router.get('/', auth, getOrders);
router.get('/:id', auth, getOrderById);
router.post('/', auth, createOrder);

// Guest checkout (no auth required)
router.post('/guest', createGuestOrder);
router.get('/guest/:id', getGuestOrderById);

module.exports = router;
