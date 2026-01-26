const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress } = require('../controllers/addressController');

// All routes require authentication
router.use(auth);

router.get('/', getAddresses);
router.post('/', addAddress);
router.put('/:id', updateAddress);
router.delete('/:id', deleteAddress);
router.put('/:id/default', setDefaultAddress);

module.exports = router;
