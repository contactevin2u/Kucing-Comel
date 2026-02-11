const db = require('../config/database');

/**
 * Get all products (admin) - includes inactive, variant counts, stock info
 */
const getAdminProducts = async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT p.id, p.name, p.description, p.price, p.member_price, p.image_url, p.image_mime,
        p.category, p.pet_type, p.stock, p.weight, p.is_active, p.created_at, p.updated_at,
        (p.image_data IS NOT NULL) AS has_db_image,
        (SELECT COUNT(*) FROM product_variants pv WHERE pv.product_id = p.id) AS variant_count,
        (SELECT COALESCE(SUM(pv.stock), 0) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) AS variant_stock
       FROM products p
       ORDER BY p.created_at DESC`
    );

    res.json({ products: result.rows });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single product with variants (admin)
 */
const getAdminProductById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT id, name, description, price, member_price, image_url, image_mime,
        category, pet_type, stock, weight, is_active, created_at, updated_at,
        (image_data IS NOT NULL) AS has_db_image
       FROM products WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const variantsResult = await db.query(
      `SELECT * FROM product_variants WHERE product_id = $1 ORDER BY id ASC`,
      [id]
    );

    res.json({
      product: result.rows[0],
      variants: variantsResult.rows
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new product (admin)
 */
const createProduct = async (req, res, next) => {
  try {
    const {
      name, description, price, member_price,
      image_url, image_data, image_mime,
      category, pet_type, stock, weight, is_active
    } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ error: 'Name and price are required.' });
    }

    if (parseFloat(price) < 0) {
      return res.status(400).json({ error: 'Price must be 0 or greater.' });
    }

    // If uploading image data, clear image_url; otherwise use provided URL
    const finalImageUrl = image_data ? null : (image_url || null);
    const finalImageData = image_data || null;
    const finalImageMime = image_data ? (image_mime || 'image/jpeg') : null;

    const result = await db.query(
      `INSERT INTO products (name, description, price, member_price, image_url, image_data, image_mime, category, pet_type, stock, weight, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING id, name, description, price, member_price, image_url, image_mime, category, pet_type, stock, weight, is_active, created_at, updated_at`,
      [
        name.trim(),
        description || null,
        parseFloat(price),
        member_price ? parseFloat(member_price) : null,
        finalImageUrl,
        finalImageData,
        finalImageMime,
        category || null,
        pet_type || null,
        parseInt(stock) || 0,
        weight ? parseFloat(weight) : null,
        is_active !== false
      ]
    );

    const product = result.rows[0];
    product.has_db_image = !!finalImageData;

    res.status(201).json({
      message: 'Product created successfully.',
      product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product (admin)
 */
const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, description, price, member_price,
      image_url, image_data, image_mime,
      category, pet_type, stock, weight, is_active
    } = req.body;

    const existing = await db.query(
      `SELECT id, name, description, price, member_price, image_url, image_mime,
        category, pet_type, stock, weight, is_active
       FROM products WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Determine image fields
    let finalImageUrl, finalImageMime;
    let updateImageData = false;
    let finalImageData = null;

    if (image_data) {
      // New upload — store base64, clear URL
      finalImageUrl = null;
      finalImageData = image_data;
      finalImageMime = image_mime || 'image/jpeg';
      updateImageData = true;
    } else if (image_url !== undefined) {
      // Manual URL provided — clear DB image
      finalImageUrl = image_url || null;
      finalImageData = null;
      finalImageMime = null;
      updateImageData = true;
    } else {
      // No image change
      finalImageUrl = existing.rows[0].image_url;
      finalImageMime = existing.rows[0].image_mime;
    }

    const result = await db.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = $2,
        price = COALESCE($3, price),
        member_price = $4,
        image_url = $5,
        image_mime = $6,
        category = $7,
        pet_type = $8,
        stock = COALESCE($9, stock),
        weight = $10,
        is_active = COALESCE($11, is_active),
        updated_at = CURRENT_TIMESTAMP
       WHERE id = $12
       RETURNING id, name, description, price, member_price, image_url, image_mime, category, pet_type, stock, weight, is_active, created_at, updated_at`,
      [
        name ? name.trim() : null,
        description !== undefined ? description : existing.rows[0].description,
        price !== undefined ? parseFloat(price) : null,
        member_price !== undefined ? (member_price ? parseFloat(member_price) : null) : existing.rows[0].member_price,
        finalImageUrl,
        finalImageMime,
        category !== undefined ? category : existing.rows[0].category,
        pet_type !== undefined ? pet_type : existing.rows[0].pet_type,
        stock !== undefined ? parseInt(stock) : null,
        weight !== undefined ? (weight ? parseFloat(weight) : null) : existing.rows[0].weight,
        is_active !== undefined ? is_active : null,
        id
      ]
    );

    // Update image_data separately (keeps id as last param for SQLite compat)
    if (updateImageData) {
      await db.query(
        `UPDATE products SET image_data = $1 WHERE id = $2`,
        [finalImageData, id]
      );
    }

    const product = result.rows[0];
    product.has_db_image = updateImageData ? !!finalImageData : !!existing.rows[0].image_mime;

    res.json({
      message: 'Product updated successfully.',
      product
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete product (admin)
 * Soft-delete (is_active=false) if product has been ordered, hard delete otherwise
 */
const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await db.query(
      `SELECT * FROM products WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Check if product has been ordered
    const orderCheck = await db.query(
      `SELECT id FROM order_items WHERE product_id = $1 LIMIT 1`,
      [id]
    );

    if (orderCheck.rows.length > 0) {
      // Soft delete - deactivate
      await db.query(
        `UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
        [id]
      );
      res.json({ message: 'Product deactivated (has existing orders).' });
    } else {
      // Hard delete - remove variants first, then product
      await db.query(`DELETE FROM product_variants WHERE product_id = $1`, [id]);
      await db.query(`DELETE FROM products WHERE id = $1`, [id]);
      res.json({ message: 'Product deleted successfully.' });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle product active status (admin)
 */
const toggleProductStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `UPDATE products SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    res.json({
      message: `Product ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully.`,
      product: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create variant for a product (admin)
 */
const createVariant = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { variant_name, price, member_price, stock, is_active } = req.body;

    if (!variant_name || price === undefined) {
      return res.status(400).json({ error: 'Variant name and price are required.' });
    }

    // Verify product exists
    const productCheck = await db.query(`SELECT id FROM products WHERE id = $1`, [id]);
    if (productCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const result = await db.query(
      `INSERT INTO product_variants (product_id, variant_name, price, member_price, stock, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        id,
        variant_name.trim(),
        parseFloat(price),
        member_price ? parseFloat(member_price) : null,
        parseInt(stock) || 0,
        is_active !== false
      ]
    );

    res.status(201).json({
      message: 'Variant created successfully.',
      variant: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update variant (admin)
 */
const updateVariant = async (req, res, next) => {
  try {
    const { id, variantId } = req.params;
    const { variant_name, price, member_price, stock, is_active } = req.body;

    const existing = await db.query(
      `SELECT * FROM product_variants WHERE id = $1 AND product_id = $2`,
      [variantId, id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found.' });
    }

    const result = await db.query(
      `UPDATE product_variants SET
        variant_name = COALESCE($1, variant_name),
        price = COALESCE($2, price),
        member_price = $3,
        stock = COALESCE($4, stock),
        is_active = COALESCE($5, is_active)
       WHERE id = $6 AND product_id = $7
       RETURNING *`,
      [
        variant_name ? variant_name.trim() : null,
        price !== undefined ? parseFloat(price) : null,
        member_price !== undefined ? (member_price ? parseFloat(member_price) : null) : existing.rows[0].member_price,
        stock !== undefined ? parseInt(stock) : null,
        is_active !== undefined ? is_active : null,
        variantId,
        id
      ]
    );

    res.json({
      message: 'Variant updated successfully.',
      variant: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete variant (admin)
 */
const deleteVariant = async (req, res, next) => {
  try {
    const { id, variantId } = req.params;

    const result = await db.query(
      `DELETE FROM product_variants WHERE id = $1 AND product_id = $2 RETURNING id`,
      [variantId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Variant not found.' });
    }

    res.json({ message: 'Variant deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminProducts,
  getAdminProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductStatus,
  createVariant,
  updateVariant,
  deleteVariant
};
