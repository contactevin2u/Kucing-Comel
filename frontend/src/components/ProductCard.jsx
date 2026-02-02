import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const getImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/300x200?text=No+Image';
  if (url.startsWith('http')) return url;
  // Backend serves images from /api/product-images - encode URL for spaces/special chars
  return `${api.getApiUrl()}/api/product-images${encodeURI(url)}`;
};

const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  // Check if product is in wishlist on mount
  useEffect(() => {
    if (isAuthenticated) {
      checkWishlistStatus();
    }
  }, [isAuthenticated, product.id]);

  const checkWishlistStatus = async () => {
    try {
      const data = await api.checkWishlist(product.id);
      setIsWishlisted(data.inWishlist);
    } catch (error) {
      // Silently fail - not critical
    }
  };

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const result = await addToCart(product.id, 1);
    if (result.success) {
      alert('Added to cart!');
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  };

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (wishlistLoading) return;

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await api.removeFromWishlist(product.id);
        setIsWishlisted(false);
      } else {
        await api.addToWishlist(product.id);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Wishlist error:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  const isNew = product.id <= 5;
  const isMemberPrice = product.isMember && product.originalPrice;

  return (
    <div className="product-card">
      {/* Badge */}
      {isMemberPrice && <span className="product-badge" style={{ background: '#FF7B54' }}>MEMBER</span>}
      {isNew && !isMemberPrice && <span className="product-badge" style={{ background: '#00BFB3' }}>NEW</span>}

      {/* Wishlist Button */}
      <button
        className="product-wishlist"
        onClick={handleWishlist}
        disabled={wishlistLoading}
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

          {/* Price Row */}
          <div className="product-price-row">
            <div>
              <span className="product-price">RM {parseFloat(product.price).toFixed(2)}</span>
              {isMemberPrice && (
                <span className="product-price-old">
                  RM {parseFloat(product.originalPrice).toFixed(2)}
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
