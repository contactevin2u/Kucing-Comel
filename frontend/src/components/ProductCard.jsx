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

  const handleBuyNow = (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Navigate to checkout with just this product
    navigate('/checkout', {
      state: {
        buyNow: true,
        item: {
          product_id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          quantity: 1,
          image_url: product.image_url,
          weight: parseFloat(product.weight) || 0
        }
      }
    });
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

          {/* Price */}
          <div className="product-price-row">
            <span className="product-price">RM {parseFloat(product.price).toFixed(2)}</span>
            {isMemberPrice && (
              <span className="product-price-old">
                RM {parseFloat(product.originalPrice).toFixed(2)}
              </span>
            )}
          </div>
        </div>
      </Link>

      {/* Action Buttons - Outside Link for better click handling */}
      <div className="product-actions">
        <button
          onClick={handleAddToCart}
          className="product-btn btn-cart"
          disabled={product.stock === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="9" cy="21" r="1"/>
            <circle cx="20" cy="21" r="1"/>
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
          </svg>
          <span>Add to Cart</span>
        </button>
        <button
          onClick={handleBuyNow}
          className="product-btn btn-buy"
          disabled={product.stock === 0}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
          <span>Buy Now</span>
        </button>
      </div>

      <style>{`
        .product-card .product-info {
          padding-bottom: 0 !important;
        }

        .product-actions {
          display: flex;
          gap: 8px;
          padding: 12px 18px 18px;
          margin-top: auto;
        }

        .product-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 12px;
          border: none;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .product-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .product-btn svg {
          flex-shrink: 0;
        }

        .btn-cart {
          background: #f0f0f0;
          color: #333;
          border: 1px solid #ddd;
        }

        .btn-cart:hover:not(:disabled) {
          background: #e0e0e0;
          border-color: #ccc;
        }

        .btn-buy {
          background: linear-gradient(135deg, #FF6B6B 0%, #ee5a5a 100%);
          color: #fff;
        }

        .btn-buy:hover:not(:disabled) {
          background: linear-gradient(135deg, #ff5252 0%, #e04848 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 107, 107, 0.4);
        }

        .btn-buy:active:not(:disabled) {
          transform: translateY(0);
        }

        @media (max-width: 480px) {
          .product-actions {
            flex-direction: column;
            gap: 6px;
          }

          .product-btn {
            padding: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default ProductCard;
