import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Wishlist = () => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [addingToCart, setAddingToCart] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchWishlist();
  }, [isAuthenticated, navigate]);

  const fetchWishlist = async () => {
    try {
      const data = await api.getWishlist();
      setWishlist(data.wishlist);
    } catch (error) {
      console.error('Failed to fetch wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId) => {
    setRemoving(productId);
    try {
      await api.removeFromWishlist(productId);
      setWishlist(wishlist.filter(item => item.product_id !== productId));
    } catch (error) {
      console.error('Failed to remove from wishlist:', error);
    } finally {
      setRemoving(null);
    }
  };

  const handleAddToCart = async (item) => {
    setAddingToCart(item.product_id);
    try {
      const result = await addToCart(item.product_id, 1);
      if (result.success) {
        alert('Added to cart!');
      } else {
        alert(result.error || 'Failed to add to cart');
      }
    } catch (error) {
      console.error('Failed to add to cart:', error);
      alert('Failed to add to cart');
    } finally {
      setAddingToCart(null);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return 'https://via.placeholder.com/300x200?text=No+Image';
    if (imageUrl.startsWith('http')) return imageUrl;
    // image_url is like "/products/litter-6l.jpg", backend serves from /api/product-images/
    const cleanPath = imageUrl.replace('/products/', '');
    return `${api.getApiUrl()}/api/product-images/${cleanPath}`;
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="wishlist-page">
      <div className="container">
        <h1 style={{ marginBottom: '30px' }}>My Wishlist</h1>

        {wishlist.length === 0 ? (
          <div className="cart-empty">
            <h2>Your wishlist is empty</h2>
            <p style={{ color: '#95A5A6', marginBottom: '20px' }}>
              Save items you love by clicking the heart icon
            </p>
            <Link to="/" className="btn btn-primary">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="wishlist-grid">
            {wishlist.map((item) => (
              <div key={item.id} className="wishlist-card">
                <Link to={`/product/${item.product_id}`} className="wishlist-image">
                  <img
                    src={getImageUrl(item.image_url)}
                    alt={item.name}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                  />
                </Link>
                <div className="wishlist-info">
                  <Link to={`/product/${item.product_id}`} className="wishlist-name">
                    {item.name}
                  </Link>
                  <p className="wishlist-category">{item.category}</p>
                  <p className="wishlist-price">RM {parseFloat(item.price).toFixed(2)}</p>
                  <div className="wishlist-actions">
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleAddToCart(item)}
                      disabled={addingToCart === item.product_id}
                    >
                      {addingToCart === item.product_id ? 'Adding...' : 'Add to Cart'}
                    </button>
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => handleRemove(item.product_id)}
                      disabled={removing === item.product_id}
                    >
                      {removing === item.product_id ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Wishlist;
