const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus
} = require('../controllers/orderController');

router.get('/', auth, getOrders);
router.get('/:id', auth, getOrderById);
router.post('/', auth, createOrder);
router.put('/:id/status', auth, adminOnly, updateOrderStatus);

module.exports = router;
