import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const getImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/300x200?text=No+Image';
  if (url.startsWith('http')) return url;
  // For local images, use the frontend URL
  const frontendUrl = process.env.REACT_APP_FRONTEND_URL || '';
  return `${frontendUrl}${url}`;
};

const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = await addToCart(product.id, 1);
    if (result.success) {
      alert('Added to cart!');
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  };

  const handleWishlist = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsWishlisted(!isWishlisted);
  };

  const isOnSale = product.stock > 50;
  const isNew = product.id <= 5;

  return (
    <div className="product-card">
      {/* Badge */}
      {isOnSale && <span className="product-badge">SALE</span>}
      {isNew && !isOnSale && <span className="product-badge" style={{ background: '#00BFB3' }}>NEW</span>}

      {/* Wishlist Button */}
      <button
        className="product-wishlist"
        onClick={handleWishlist}
        style={{ color: isWishlisted ? '#FF7B54' : '#B2BEC3' }}
      >
        {isWishlisted ? '♥' : '♡'}
      </button>

      <Link to={`/product/${product.id}`}>
        {/* Product Image */}
        <div className="product-image-wrapper">
          <img
            src={getImageUrl(product.image_url)}
            alt={product.name}
            className="product-image"
          />
        </div>

        {/* Product Info */}
        <div className="product-info">
          <span className="product-category">{product.category}</span>
          <h3 className="product-name">{product.name}</h3>

          {/* Rating */}
          <div className="product-rating">
            <span className="stars">★★★★★</span>
            <span className="rating-count">(24)</span>
          </div>

          {/* Price Row */}
          <div className="product-price-row">
            <div>
              <span className="product-price">RM {parseFloat(product.price).toFixed(2)}</span>
              {isOnSale && (
                <span className="product-price-old">
                  RM {(parseFloat(product.price) * 1.3).toFixed(2)}
                </span>
              )}
            </div>
            <button
              onClick={handleAddToCart}
              className="add-to-cart-btn"
              disabled={product.stock === 0}
              title={product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
            >
              🛒
            </button>
          </div>
        </div>
      </Link>
    </div>
  );
};

export default ProductCard;
