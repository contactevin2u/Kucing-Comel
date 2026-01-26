const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist
} = require('../controllers/wishlistController');

// All wishlist routes require authentication
router.use(auth);

// Get user's wishlist
router.get('/', getWishlist);

// Add product to wishlist
router.post('/add', addToWishlist);

// Remove product from wishlist
router.delete('/remove/:product_id', removeFromWishlist);

// Check if product is in wishlist
router.get('/check/:product_id', checkWishlist);

module.exports = router;
