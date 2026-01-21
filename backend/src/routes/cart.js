const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');

router.get('/', auth, getCart);
router.post('/add', auth, addToCart);
router.put('/update', auth, updateCartItem);
router.delete('/remove/:itemId', auth, removeFromCart);
router.delete('/clear', auth, clearCart);

module.exports = router;
