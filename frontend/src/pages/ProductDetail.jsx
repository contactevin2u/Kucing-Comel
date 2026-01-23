import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const getImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/500x400?text=No+Image';
  if (url.startsWith('http')) return url;
  const frontendUrl = process.env.REACT_APP_FRONTEND_URL || '';
  return `${frontendUrl}${url}`;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const data = await api.getProduct(id);
      setProduct(data.product);
      // Auto-select first variant if product has variants
      if (data.product.hasVariants && data.product.variants?.length > 0) {
        setSelectedVariant(data.product.variants[0]);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (e) => {
    const variantId = parseInt(e.target.value);
    const variant = product.variants.find(v => v.id === variantId);
    setSelectedVariant(variant);
    setQuantity(1); // Reset quantity when variant changes
  };

  // Get current price based on selected variant or product
  const getCurrentPrice = () => {
    if (selectedVariant) {
      return parseFloat(selectedVariant.price);
    }
    return parseFloat(product.price);
  };

  // Get original price (for members showing discount)
  const getOriginalPrice = () => {
    if (selectedVariant && selectedVariant.originalPrice) {
      return parseFloat(selectedVariant.originalPrice);
    }
    if (product.originalPrice) {
      return parseFloat(product.originalPrice);
    }
    return null;
  };

  // Get current stock based on selected variant or product
  const getCurrentStock = () => {
    if (selectedVariant) {
      return selectedVariant.stock;
    }
    return product.stock;
  };

  const handleQuantityChange = (delta) => {
    const currentStock = getCurrentStock();
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= currentStock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    setAdding(true);
    const result = await addToCart(product.id, quantity, selectedVariant?.id);
    setAdding(false);

    if (result.success) {
      alert('Added to cart!');
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    setAdding(true);
    const result = await addToCart(product.id, quantity, selectedVariant?.id);
    setAdding(false);

    if (result.success) {
      navigate('/cart');
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2>Product not found</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Back to Shop
        </button>
      </div>
    );
  }

  const currentStock = getCurrentStock();
  const currentPrice = getCurrentPrice();
  const originalPrice = getOriginalPrice();

  const getStockStatus = () => {
    if (currentStock === 0) return { text: 'Out of Stock', class: 'out' };
    if (currentStock < 10) return { text: `Only ${currentStock} left!`, class: 'low' };
    return { text: 'In Stock', class: '' };
  };

  const stockStatus = getStockStatus();

  return (
    <section className="product-detail">
      <div className="container">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-outline btn-sm"
          style={{ marginBottom: '30px' }}
        >
          ← Back
        </button>

        <div className="product-detail-grid">
          <div className="product-detail-image">
            <img
              src={getImageUrl(product.image_url)}
              alt={product.name}
            />
          </div>

          <div className="product-detail-info">
            <span className="product-category">{product.category}</span>
            <h1>{product.name}</h1>

            {/* Variant Selector */}
            {product.hasVariants && product.variants?.length > 0 && (
              <div className="variant-selector">
                <label htmlFor="variant-select">Select Option:</label>
                <select
                  id="variant-select"
                  value={selectedVariant?.id || ''}
                  onChange={handleVariantChange}
                  className="variant-dropdown"
                >
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.variant_name} - RM {parseFloat(variant.price).toFixed(2)}
                      {variant.stock < 10 && variant.stock > 0 ? ` (${variant.stock} left)` : ''}
                      {variant.stock === 0 ? ' (Out of Stock)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Price Display */}
            <div className="product-detail-price-wrapper">
              <p className="product-detail-price">RM {currentPrice.toFixed(2)}</p>
              {product.isMember && originalPrice && originalPrice > currentPrice && (
                <>
                  <span className="product-detail-price-old">RM {originalPrice.toFixed(2)}</span>
                  <span className="member-badge">MEMBER PRICE</span>
                </>
              )}
            </div>

            {/* Member Price Message for Non-logged in users */}
            {!isAuthenticated && (
              <div className="member-price-hint">
                <Link to="/login">Login</Link> to unlock member prices!
              </div>
            )}

            <p className={`stock-info ${stockStatus.class}`}>{stockStatus.text}</p>

            <p className="product-detail-description">
              {product.description || 'No description available.'}
            </p>

            {currentStock > 0 && (
              <>
                <div className="quantity-selector">
                  <span>Quantity:</span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= currentStock}
                  >
                    +
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '15px' }}>
                  <button
                    onClick={handleAddToCart}
                    className="btn btn-outline btn-lg"
                    disabled={adding}
                  >
                    {adding ? 'Adding...' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className="btn btn-primary btn-lg"
                    disabled={adding}
                  >
                    Buy Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetail;
