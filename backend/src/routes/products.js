const express = require('express');
const router = express.Router();
const { auth, adminOnly } = require('../middleware/auth');
const {
  getAllProducts,
  getProductById,
  getCategories,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

router.get('/', getAllProducts);
router.get('/categories', getCategories);
router.get('/:id', getProductById);
router.post('/', auth, adminOnly, createProduct);
router.put('/:id', auth, adminOnly, updateProduct);
router.delete('/:id', auth, adminOnly, deleteProduct);

module.exports = router;
