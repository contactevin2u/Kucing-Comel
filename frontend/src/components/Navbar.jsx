import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      {/* Main Navbar */}
      <nav className="navbar">
        <div className="container">
          {/* Logo */}
          <Link to="/" className="logo">
            <span>🐱</span> Kucing Comel
          </Link>

          {/* Right Navigation */}
          <div className="nav-right">
            {isAuthenticated ? (
              <>
                <Link to="/orders">My Orders</Link>
                <div className="nav-icons">
                  <button className="nav-icon" title="Search">🔍</button>
                  <button className="nav-icon" title="Wishlist">♡</button>
                  <Link to="/cart" className="nav-icon" title="Cart">
                    🛒
                    {cart.item_count > 0 && (
                      <span className="cart-badge">{cart.item_count}</span>
                    )}
                  </Link>
                  <button
                    className="nav-icon"
                    onClick={handleLogout}
                    title={`Logout (${user?.name?.split(' ')[0]})`}
                  >
                    👤
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/cart" className="nav-icon" title="Cart" style={{ marginRight: '10px' }}>
                  🛒
                  {cart.item_count > 0 && (
                    <span className="cart-badge">{cart.item_count}</span>
                  )}
                </Link>
                <Link to="/login">Login</Link>
                <Link to="/register" className="btn btn-primary btn-sm">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;
