const express = require('express');
const router = express.Router();
const { getVariantImages, getMainImages, getVariations } = require('../controllers/variantImagesController');

// Get available variations for a product
router.get('/:productSlug/variations', getVariations);

// Get images for a specific variant
router.get('/:productSlug/variant/:variantName', getVariantImages);

// Get main product images (fallback)
router.get('/:productSlug/main', getMainImages);

module.exports = router;
