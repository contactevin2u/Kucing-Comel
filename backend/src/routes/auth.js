const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const { register, login, getMe, updateProfile, changePassword } = require('../controllers/authController');

router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);
router.put('/profile', auth, updateProfile);
router.put('/password', auth, changePassword);

module.exports = router;
