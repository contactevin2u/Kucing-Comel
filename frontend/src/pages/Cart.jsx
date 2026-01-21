import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const { cart, loading } = useCart();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="cart-empty">
            <h2>Please login to view your cart</h2>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="cart-page">
        <div className="container">
          <div className="cart-empty">
            <h2>🛒 Your cart is empty</h2>
            <p style={{ color: '#95A5A6', marginBottom: '20px' }}>
              Looks like you haven't added anything yet
            </p>
            <Link to="/" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      <div className="container">
        <h1 style={{ marginBottom: '30px' }}>Shopping Cart</h1>

        <div className="cart-grid">
          <div className="cart-items">
            {cart.items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>

            <div className="summary-row">
              <span>Items ({cart.item_count})</span>
              <span>RM {cart.total}</span>
            </div>

            <div className="summary-row">
              <span>Shipping</span>
              <span style={{ color: '#27AE60' }}>FREE</span>
            </div>

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>RM {cart.total}</span>
            </div>

            <button
              onClick={() => navigate('/checkout')}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '20px' }}
            >
              Proceed to Checkout
            </button>

            <Link
              to="/"
              style={{
                display: 'block',
                textAlign: 'center',
                marginTop: '15px',
                color: '#95A5A6'
              }}
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
