const db = require('../config/database');

const getAddresses = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, label, recipient_name, phone, address_line1, address_line2,
              city, state, postal_code, country, is_default, created_at
       FROM addresses
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [req.user.id]
    );
    res.json({ addresses: result.rows });
  } catch (error) {
    next(error);
  }
};

const addAddress = async (req, res, next) => {
  try {
    const { label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default } = req.body;

    if (!recipient_name || !phone || !address_line1 || !city || !state || !postal_code) {
      return res.status(400).json({ error: 'Required fields: recipient_name, phone, address_line1, city, state, postal_code' });
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    // Check if this is the first address - make it default automatically
    const countResult = await db.query('SELECT COUNT(*) as count FROM addresses WHERE user_id = $1', [req.user.id]);
    const isFirstAddress = parseInt(countResult.rows[0].count) === 0;

    const result = await db.query(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default, created_at`,
      [req.user.id, label || 'Home', recipient_name, phone, address_line1, address_line2 || null, city, state, postal_code, country || 'Malaysia', is_default || isFirstAddress]
    );

    res.status(201).json({ address: result.rows[0], message: 'Address added successfully.' });
  } catch (error) {
    next(error);
  }
};

const updateAddress = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default } = req.body;

    // Verify address belongs to user
    const checkResult = await db.query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found.' });
    }

    // If setting as default, unset other defaults first
    if (is_default) {
      await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);
    }

    const result = await db.query(
      `UPDATE addresses SET
        label = COALESCE($1, label),
        recipient_name = COALESCE($2, recipient_name),
        phone = COALESCE($3, phone),
        address_line1 = COALESCE($4, address_line1),
        address_line2 = COALESCE($5, address_line2),
        city = COALESCE($6, city),
        state = COALESCE($7, state),
        postal_code = COALESCE($8, postal_code),
        country = COALESCE($9, country),
        is_default = COALESCE($10, is_default)
       WHERE id = $11 AND user_id = $12
       RETURNING id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default, created_at`,
      [label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default, id, req.user.id]
    );

    res.json({ address: result.rows[0], message: 'Address updated successfully.' });
  } catch (error) {
    next(error);
  }
};

const deleteAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify address belongs to user and check if it's default
    const checkResult = await db.query('SELECT id, is_default FROM addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found.' });
    }

    const wasDefault = checkResult.rows[0].is_default;

    await db.query('DELETE FROM addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);

    // If deleted address was default, set another address as default
    if (wasDefault) {
      await db.query(
        'UPDATE addresses SET is_default = true WHERE user_id = $1 AND id = (SELECT id FROM addresses WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1)',
        [req.user.id]
      );
    }

    res.json({ message: 'Address deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

const setDefaultAddress = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify address belongs to user
    const checkResult = await db.query('SELECT id FROM addresses WHERE id = $1 AND user_id = $2', [id, req.user.id]);
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Address not found.' });
    }

    // Unset all defaults
    await db.query('UPDATE addresses SET is_default = false WHERE user_id = $1', [req.user.id]);

    // Set this address as default
    const result = await db.query(
      'UPDATE addresses SET is_default = true WHERE id = $1 AND user_id = $2 RETURNING id, label, recipient_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default, created_at',
      [id, req.user.id]
    );

    res.json({ address: result.rows[0], message: 'Default address updated.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress };
