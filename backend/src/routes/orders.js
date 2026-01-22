const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getOrders,
  getOrderById,
  createOrder
} = require('../controllers/orderController');

router.get('/', auth, getOrders);
router.get('/:id', auth, getOrderById);
router.post('/', auth, createOrder);

module.exports = router;
