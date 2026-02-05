const express = require('express');
const router = express.Router();
const { validateVoucher } = require('../controllers/voucherController');

// Public endpoint to validate voucher
router.post('/validate', validateVoucher);

module.exports = router;
