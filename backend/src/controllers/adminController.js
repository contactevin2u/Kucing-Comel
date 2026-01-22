const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateAdminToken = (email) => {
  return jwt.sign(
    { email, role: 'admin' },
    process.env.JWT_SECRET,
    { expiresIn: '2h' }
  );
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

    if (!adminEmail || !adminPasswordHash) {
      console.error('Admin credentials not configured in environment variables');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    if (email.toLowerCase() !== adminEmail.toLowerCase()) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, adminPasswordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = generateAdminToken(email);

    res.json({
      message: 'Admin login successful',
      token,
      admin: { email: adminEmail, role: 'admin' }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

module.exports = { login };
