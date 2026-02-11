import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { Search, Heart, ShoppingCart, User, LogOut, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef(null);
  const inputRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleWishlistClick = () => {
    if (isAuthenticated) {
      navigate('/wishlist');
    } else {
      navigate('/login');
    }
  };

  const handleSearchClick = () => {
    setSearchOpen(true);
  };

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  // Close search when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
        setSearchQuery('');
        setSearchResults([]);
      }
    };

    if (searchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchOpen]);

  // Search products with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const debounce = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.getProducts({ search: searchQuery });
        setSearchResults(data.products.slice(0, 5));
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSearchSelect = (productId) => {
    navigate(`/product/${productId}`);
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      handleSearchSelect(searchResults[0].id);
    }
  };

  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return 'https://via.placeholder.com/300x200?text=No+Image';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${api.getApiUrl()}/api/product-images${encodeURI(imageUrl)}`;
  };

  return (
    <>
      {/* Main Navbar */}
      <nav className="navbar">
        <div className="container">
          {/* Logo */}
          <Link to="/" className="logo">
            <img src="/lilien-logo.png" alt="Lilien" className="logo-img" />
          </Link>

          {/* Right Navigation */}
          <div className="nav-right">
            {isAuthenticated ? (
              <>
                <Link to="/orders">My Orders</Link>
                <div className="nav-icons">
                  <button className="nav-icon" title="Search" onClick={handleSearchClick}>
                    <Search size={22} strokeWidth={1.5} />
                  </button>
                  <button className="nav-icon" title="Wishlist" onClick={handleWishlistClick}>
                    <Heart size={22} strokeWidth={1.5} />
                  </button>
                  <Link to="/cart" className="nav-icon" title="Cart">
                    <ShoppingCart size={22} strokeWidth={1.5} />
                    {cart.item_count > 0 && (
                      <span className="cart-badge">{cart.item_count}</span>
                    )}
                  </Link>
                  <Link
                    to="/profile"
                    className="nav-icon"
                    title={`Profile (${user?.name?.split(' ')[0]})`}
                  >
                    <User size={22} strokeWidth={1.5} />
                  </Link>
                  <button
                    className="nav-icon"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut size={22} strokeWidth={1.5} />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="nav-icons">
                  <button className="nav-icon" title="Search" onClick={handleSearchClick}>
                    <Search size={22} strokeWidth={1.5} />
                  </button>
                  <button className="nav-icon" title="Wishlist" onClick={handleWishlistClick}>
                    <Heart size={22} strokeWidth={1.5} />
                  </button>
                  <Link to="/cart" className="nav-icon" title="Cart">
                    <ShoppingCart size={22} strokeWidth={1.5} />
                    {cart.item_count > 0 && (
                      <span className="cart-badge">{cart.item_count}</span>
                    )}
                  </Link>
                </div>
                <Link to="/login">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Search Modal Overlay */}
      {searchOpen && (
        <div className="search-overlay">
          <div className="search-modal" ref={searchRef}>
            <form onSubmit={handleSearchSubmit}>
              <div className="search-input-wrapper">
                <span className="search-input-icon">
                  <Search size={20} strokeWidth={1.5} />
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button
                  type="button"
                  className="search-close"
                  onClick={() => {
                    setSearchOpen(false);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
              </div>
            </form>

            {/* Search Results */}
            {searchQuery && (
              <div className="search-results">
                {searching ? (
                  <div className="search-loading">Searching...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map((product) => (
                    <div
                      key={product.id}
                      className="search-result-item"
                      onClick={() => handleSearchSelect(product.id)}
                    >
                      <img
                        src={getImageUrl(product.image_url)}
                        alt={product.name}
                        className="search-result-image"
                        onError={(e) => { e.target.src = 'https://via.placeholder.com/300x200?text=No+Image'; }}
                      />
                      <div className="search-result-info">
                        <div className="search-result-name">{product.name}</div>
                        <div className="search-result-price">RM {parseFloat(product.price).toFixed(2)}</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="search-no-results">No products found</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
