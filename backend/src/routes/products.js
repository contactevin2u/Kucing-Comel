const express = require('express');
const router = express.Router();
const { optionalAuth } = require('../middleware/auth');
const {
  getAllProducts,
  getProductById,
  getCategories
} = require('../controllers/productController');

// Use optionalAuth to detect logged-in members for pricing
router.get('/', optionalAuth, getAllProducts);
router.get('/categories', getCategories);
router.get('/:id', optionalAuth, getProductById);

module.exports = router;
