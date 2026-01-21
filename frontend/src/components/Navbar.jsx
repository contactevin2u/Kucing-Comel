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
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">
          <span>🐱</span> Kucing Comel
        </Link>

        <div className="nav-links">
          <Link to="/">Shop</Link>

          {isAuthenticated ? (
            <>
              <Link to="/orders">Orders</Link>
              <Link to="/cart" className="cart-icon">
                🛒
                {cart.item_count > 0 && (
                  <span className="cart-badge">{cart.item_count}</span>
                )}
              </Link>
              <span style={{ color: '#95A5A6' }}>Hi, {user?.name?.split(' ')[0]}</span>
              <button onClick={handleLogout} className="btn btn-outline btn-sm">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
