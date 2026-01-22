const express = require('express');
const router = express.Router();
const { login } = require('../controllers/adminController');
const { adminAuth } = require('../middleware/auth');

// Public admin routes
router.post('/login', login);

// Protected admin routes (add more as needed)
router.get('/verify', adminAuth, (req, res) => {
  res.json({ valid: true, admin: req.admin });
});

module.exports = router;
