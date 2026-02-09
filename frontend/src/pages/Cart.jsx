import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const { cart, loading } = useCart();
  const navigate = useNavigate();

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

  // SPX shipping rate calculation
  const calculateShipping = (weightKg) => {
    if (weightKg <= 0) return 6.89;
    const w = Math.ceil(weightKg);
    if (w <= 2) return 6.89;
    return 9.00 + (w - 3) * 1.00;
  };

  const subtotal = parseFloat(cart.total);
  const totalWeight = cart.items.reduce(
    (sum, item) => sum + (parseFloat(item.weight) || 0) * item.quantity, 0
  );
  const deliveryFee = subtotal >= 150 ? 0 : calculateShipping(totalWeight);

  return (
    <div className="cart-page">
      <div className="container">
        <h1 style={{ marginBottom: '30px' }}>Shopping Cart</h1>

        {/* Guest Notice */}
        {!isAuthenticated && (
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #2196F3',
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>&#128100;</span>
            <span style={{ fontSize: '0.9rem', color: '#1565C0' }}>
              You can checkout as guest. <Link to="/login" style={{ color: '#1565C0', fontWeight: '600' }}>Login</Link> to track your orders.
            </span>
          </div>
        )}

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
              <span>Shipping ({Math.ceil(totalWeight) || 1}kg)</span>
              {deliveryFee === 0 ? (
                <span style={{ color: '#27AE60' }}>FREE</span>
              ) : (
                <span>RM {deliveryFee.toFixed(2)}</span>
              )}
            </div>

            {deliveryFee > 0 && subtotal < 150 && (
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                Spend RM {(150 - subtotal).toFixed(2)} more for free shipping
              </div>
            )}

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>RM {(subtotal + deliveryFee).toFixed(2)}</span>
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
