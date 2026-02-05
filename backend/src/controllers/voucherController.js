const db = require('../config/database');

/**
 * Validate a voucher code
 * Returns voucher details if valid, error if not
 */
const validateVoucher = async (req, res, next) => {
  try {
    const { code, subtotal, email } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Voucher code is required.' });
    }

    const result = await db.query(
      `SELECT * FROM vouchers WHERE LOWER(code) = LOWER($1)`,
      [code.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid voucher code.' });
    }

    const voucher = result.rows[0];

    // Check if voucher is active
    if (!voucher.is_active) {
      return res.status(400).json({ error: 'This voucher is no longer active.' });
    }

    // Check start date
    const now = new Date();
    if (voucher.start_date && new Date(voucher.start_date) > now) {
      return res.status(400).json({ error: 'This voucher is not yet valid.' });
    }

    // Check expiry date
    if (voucher.expiry_date && new Date(voucher.expiry_date) < now) {
      return res.status(400).json({ error: 'This voucher has expired.' });
    }

    // Check usage limit
    if (voucher.usage_limit !== null && voucher.times_used >= voucher.usage_limit) {
      return res.status(400).json({ error: 'This voucher has reached its usage limit.' });
    }

    // Check per-user usage (if email provided and once_per_user is enabled)
    if (email && voucher.once_per_user) {
      const usageResult = await db.query(
        `SELECT id FROM voucher_usage WHERE voucher_id = $1 AND LOWER(user_email) = LOWER($2)`,
        [voucher.id, email.trim()]
      );

      if (usageResult.rows.length > 0) {
        return res.status(400).json({ error: 'You have already used this voucher.' });
      }
    }

    // Check minimum order amount
    const orderSubtotal = parseFloat(subtotal) || 0;
    if (voucher.min_order_amount && orderSubtotal < parseFloat(voucher.min_order_amount)) {
      return res.status(400).json({
        error: `Minimum order amount of RM${parseFloat(voucher.min_order_amount).toFixed(2)} required for this voucher.`
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (voucher.discount_type === 'fixed') {
      discountAmount = parseFloat(voucher.discount_amount);
    } else if (voucher.discount_type === 'percentage') {
      discountAmount = (orderSubtotal * parseFloat(voucher.discount_amount)) / 100;
      // Apply max discount cap if set
      if (voucher.max_discount && discountAmount > parseFloat(voucher.max_discount)) {
        discountAmount = parseFloat(voucher.max_discount);
      }
    }

    // Discount cannot exceed subtotal
    if (discountAmount > orderSubtotal) {
      discountAmount = orderSubtotal;
    }

    res.json({
      valid: true,
      voucher: {
        id: voucher.id,
        code: voucher.code,
        discount_type: voucher.discount_type,
        discount_amount: parseFloat(voucher.discount_amount),
        max_discount: voucher.max_discount ? parseFloat(voucher.max_discount) : null,
        min_order_amount: voucher.min_order_amount ? parseFloat(voucher.min_order_amount) : null
      },
      calculated_discount: discountAmount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all vouchers (admin)
 */
const getAllVouchers = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT * FROM vouchers ORDER BY created_at DESC`
    );

    res.json({ vouchers: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Get voucher by ID (admin)
 */
const getVoucherById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT * FROM vouchers WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voucher not found.' });
    }

    res.json({ voucher: result.rows[0] });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new voucher (admin)
 */
const createVoucher = async (req, res, next) => {
  try {
    const {
      code,
      discount_type,
      discount_amount,
      max_discount,
      min_order_amount,
      start_date,
      expiry_date,
      usage_limit,
      once_per_user,
      is_active
    } = req.body;

    // Validate required fields
    if (!code || !discount_type || discount_amount === undefined) {
      return res.status(400).json({ error: 'Code, discount type, and discount amount are required.' });
    }

    if (!['fixed', 'percentage'].includes(discount_type)) {
      return res.status(400).json({ error: 'Discount type must be "fixed" or "percentage".' });
    }

    if (discount_amount <= 0) {
      return res.status(400).json({ error: 'Discount amount must be greater than 0.' });
    }

    if (discount_type === 'percentage' && discount_amount > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
    }

    // Check for duplicate code
    const existingResult = await db.query(
      `SELECT id FROM vouchers WHERE LOWER(code) = LOWER($1)`,
      [code.trim()]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'A voucher with this code already exists.' });
    }

    const result = await db.query(
      `INSERT INTO vouchers (code, discount_type, discount_amount, max_discount, min_order_amount, start_date, expiry_date, usage_limit, once_per_user, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        code.trim().toUpperCase(),
        discount_type,
        discount_amount,
        max_discount || null,
        min_order_amount || null,
        start_date || null,
        expiry_date || null,
        usage_limit || null,
        once_per_user !== false,
        is_active !== false
      ]
    );

    res.status(201).json({
      message: 'Voucher created successfully.',
      voucher: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update voucher (admin)
 */
const updateVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      code,
      discount_type,
      discount_amount,
      max_discount,
      min_order_amount,
      start_date,
      expiry_date,
      usage_limit,
      once_per_user,
      is_active
    } = req.body;

    // Check if voucher exists
    const existingResult = await db.query(
      `SELECT * FROM vouchers WHERE id = $1`,
      [id]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Voucher not found.' });
    }

    // Check for duplicate code (excluding current voucher)
    if (code) {
      const duplicateResult = await db.query(
        `SELECT id FROM vouchers WHERE LOWER(code) = LOWER($1) AND id != $2`,
        [code.trim(), id]
      );

      if (duplicateResult.rows.length > 0) {
        return res.status(409).json({ error: 'A voucher with this code already exists.' });
      }
    }

    // Validate discount type and amount
    if (discount_type && !['fixed', 'percentage'].includes(discount_type)) {
      return res.status(400).json({ error: 'Discount type must be "fixed" or "percentage".' });
    }

    if (discount_amount !== undefined && discount_amount <= 0) {
      return res.status(400).json({ error: 'Discount amount must be greater than 0.' });
    }

    const finalDiscountType = discount_type || existingResult.rows[0].discount_type;
    if (finalDiscountType === 'percentage' && discount_amount > 100) {
      return res.status(400).json({ error: 'Percentage discount cannot exceed 100%.' });
    }

    const result = await db.query(
      `UPDATE vouchers SET
        code = COALESCE($1, code),
        discount_type = COALESCE($2, discount_type),
        discount_amount = COALESCE($3, discount_amount),
        max_discount = $4,
        min_order_amount = $5,
        start_date = $6,
        expiry_date = $7,
        usage_limit = $8,
        once_per_user = COALESCE($9, once_per_user),
        is_active = COALESCE($10, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        code ? code.trim().toUpperCase() : null,
        discount_type,
        discount_amount,
        max_discount !== undefined ? max_discount : existingResult.rows[0].max_discount,
        min_order_amount !== undefined ? min_order_amount : existingResult.rows[0].min_order_amount,
        start_date !== undefined ? start_date : existingResult.rows[0].start_date,
        expiry_date !== undefined ? expiry_date : existingResult.rows[0].expiry_date,
        usage_limit !== undefined ? usage_limit : existingResult.rows[0].usage_limit,
        once_per_user,
        is_active,
        id
      ]
    );

    res.json({
      message: 'Voucher updated successfully.',
      voucher: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete voucher (admin)
 */
const deleteVoucher = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `DELETE FROM vouchers WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voucher not found.' });
    }

    res.json({ message: 'Voucher deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle voucher active status (admin)
 */
const toggleVoucherStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE vouchers SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Voucher not found.' });
    }

    res.json({
      message: `Voucher ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully.`,
      voucher: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Increment voucher usage count and record user usage (internal use)
 */
const incrementVoucherUsage = async (voucherId, userEmail, orderId) => {
  // Increment total usage count
  await db.query(
    `UPDATE vouchers SET times_used = times_used + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [voucherId]
  );

  // Record per-user usage
  if (userEmail) {
    try {
      await db.query(
        `INSERT INTO voucher_usage (voucher_id, user_email, order_id) VALUES ($1, $2, $3)`,
        [voucherId, userEmail.toLowerCase(), orderId]
      );
    } catch (e) {
      // Ignore duplicate key error (user already used this voucher)
      console.log('Voucher usage already recorded for this user');
    }
  }
};

module.exports = {
  validateVoucher,
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucherStatus,
  incrementVoucherUsage
};
