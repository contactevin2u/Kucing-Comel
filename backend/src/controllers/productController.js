const db = require('../config/database');

// Helper function to format product based on user authentication
const formatProduct = (product, isMember) => {
  const hasDbImage = product.has_db_image === true || product.has_db_image === 1;
  if (isMember) {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      has_db_image: hasDbImage,
      category: product.category,
      pet_type: product.pet_type,
      stock: product.stock,
      price: product.member_price || product.price,
      originalPrice: product.price,
      isMember: true
    };
  } else {
    return {
      id: product.id,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      has_db_image: hasDbImage,
      category: product.category,
      pet_type: product.pet_type,
      stock: product.stock,
      price: product.price,
      isMember: false
    };
  }
};

// Helper function to format variant based on user authentication
const formatVariant = (variant, isMember) => {
  if (isMember) {
    return {
      id: variant.id,
      variant_name: variant.variant_name,
      price: variant.member_price || variant.price,
      originalPrice: variant.price,
      stock: variant.stock
    };
  } else {
    return {
      id: variant.id,
      variant_name: variant.variant_name,
      price: variant.price,
      stock: variant.stock
    };
  }
};

const getAllProducts = async (req, res, next) => {
  try {
    const { category, petType, search, sort, limit = 50, offset = 0 } = req.query;
    const isMember = !!req.user;

    let query = 'SELECT id, name, description, price, member_price, image_url, image_mime, category, pet_type, stock, weight, is_active, created_at, updated_at, (image_data IS NOT NULL) AS has_db_image FROM products WHERE is_active = true';
    const params = [];
    let paramCount = 0;

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (petType) {
      paramCount++;
      query += ` AND pet_type = $${paramCount}`;
      params.push(petType);
    }

    if (search) {
      paramCount++;
      query += ` AND (LOWER(name) LIKE LOWER($${paramCount}) OR LOWER(description) LIKE LOWER($${paramCount}))`;
      params.push(`%${search}%`);
    }

    if (sort === 'price_asc') {
      query += ' ORDER BY price ASC';
    } else if (sort === 'price_desc') {
      query += ' ORDER BY price DESC';
    } else if (sort === 'newest') {
      query += ' ORDER BY created_at DESC';
    } else {
      query += ' ORDER BY id ASC';
    }

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(parseInt(limit));

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(parseInt(offset));

    const result = await db.query(query, params);

    const countQuery = 'SELECT COUNT(*) FROM products WHERE is_active = true';
    const countResult = await db.query(countQuery);

    // Format products based on member status
    const products = result.rows.map(product => formatProduct(product, isMember));

    res.json({
      products,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
      isMember
    });
  } catch (error) {
    next(error);
  }
};

const getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const isMember = !!req.user;

    const result = await db.query(
      'SELECT id, name, description, price, member_price, image_url, image_mime, category, pet_type, stock, weight, is_active, created_at, updated_at, (image_data IS NOT NULL) AS has_db_image FROM products WHERE id = $1 AND is_active = true',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Fetch variants for this product
    const variantsResult = await db.query(
      'SELECT * FROM product_variants WHERE product_id = $1 AND is_active = true ORDER BY id ASC',
      [id]
    );

    const product = formatProduct(result.rows[0], isMember);
    const variants = variantsResult.rows.map(v => formatVariant(v, isMember));

    // If product has variants, include them in the response
    if (variants.length > 0) {
      product.variants = variants;
      product.hasVariants = true;
    } else {
      product.hasVariants = false;
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM products WHERE is_active = true AND category IS NOT NULL ORDER BY category'
    );

    res.json({ categories: result.rows.map(row => row.category) });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getCategories
};
