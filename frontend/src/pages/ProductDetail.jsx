import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const data = await api.getProduct(id);
      setProduct(data.product);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (delta) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= product.stock) {
      setQuantity(newQuantity);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAdding(true);
    const result = await addToCart(product.id, quantity);
    setAdding(false);

    if (result.success) {
      alert('Added to cart!');
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    setAdding(true);
    const result = await addToCart(product.id, quantity);
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

  const getStockStatus = () => {
    if (product.stock === 0) return { text: 'Out of Stock', class: 'out' };
    if (product.stock < 10) return { text: `Only ${product.stock} left!`, class: 'low' };
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

            <div className="product-detail-price-wrapper">
              <p className="product-detail-price">RM {parseFloat(product.price).toFixed(2)}</p>
              {product.isMember && product.originalPrice && (
                <>
                  <span className="product-detail-price-old">RM {parseFloat(product.originalPrice).toFixed(2)}</span>
                  <span className="member-badge">MEMBER PRICE</span>
                </>
              )}
            </div>

            <p className={`stock-info ${stockStatus.class}`}>{stockStatus.text}</p>

            <p className="product-detail-description">
              {product.description || 'No description available.'}
            </p>

            {product.stock > 0 && (
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
                    disabled={quantity >= product.stock}
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
