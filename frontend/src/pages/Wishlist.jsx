import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Wishlist = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);

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

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return 'https://via.placeholder.com/300x200?text=No+Image';
    if (imageUrl.startsWith('http')) return imageUrl;
    // image_url is like "/Folder Name/image.jpg", backend serves from /api/product-images
    return `${api.getApiUrl()}/api/product-images${encodeURI(imageUrl)}`;
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
