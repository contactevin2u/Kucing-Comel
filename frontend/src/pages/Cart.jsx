import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import CartItem from '../components/CartItem';

const Cart = () => {
  const { isAuthenticated } = useAuth();
  const { cart, loading } = useCart();
  const navigate = useNavigate();

  // Selected items state - default to all items selected
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Initialize selection when cart items change
  useEffect(() => {
    setSelectedIds(new Set(cart.items.map(item => item.id)));
  }, [cart.items]);

  const toggleSelect = (itemId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cart.items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cart.items.map(item => item.id)));
    }
  };

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
            <h2>Your cart is empty</h2>
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

  // Only compute summary for selected items
  const selectedItems = cart.items.filter(item => selectedIds.has(item.id));

  const hasSelectedStockIssues = selectedItems.some(item =>
    (item.stock !== undefined && item.stock !== null) && (item.stock <= 0 || item.quantity > item.stock)
  );

  const selectedCount = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = selectedItems.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity, 0
  );
  const totalWeight = selectedItems.reduce(
    (sum, item) => sum + (parseFloat(item.weight) || 0) * item.quantity, 0
  );
  const deliveryFee = subtotal >= 150 ? 0 : calculateShipping(totalWeight);

  const noItemsSelected = selectedItems.length === 0;
  const cannotCheckout = noItemsSelected || hasSelectedStockIssues;

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
            {/* Select All */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              marginBottom: '15px'
            }}>
              <input
                type="checkbox"
                checked={selectedIds.size === cart.items.length && cart.items.length > 0}
                onChange={toggleSelectAll}
                style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#E891A8' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: '500' }}>
                Select All ({cart.items.length} items)
              </span>
            </div>

            {cart.items.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>

            <div className="summary-row">
              <span>Selected Items ({selectedCount})</span>
              <span>RM {subtotal.toFixed(2)}</span>
            </div>

            <div className="summary-row">
              <span>Shipping ({Math.ceil(totalWeight) || 1}kg)</span>
              {noItemsSelected ? (
                <span>-</span>
              ) : deliveryFee === 0 ? (
                <span style={{ color: '#27AE60' }}>FREE</span>
              ) : (
                <span>RM {deliveryFee.toFixed(2)}</span>
              )}
            </div>

            {!noItemsSelected && deliveryFee > 0 && subtotal < 150 && (
              <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '4px' }}>
                Spend RM {(150 - subtotal).toFixed(2)} more for free shipping
              </div>
            )}

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>RM {noItemsSelected ? '0.00' : (subtotal + deliveryFee).toFixed(2)}</span>
            </div>

            {hasSelectedStockIssues && (
              <div style={{
                background: '#fdecea',
                border: '1px solid #e74c3c',
                borderRadius: '8px',
                padding: '10px 14px',
                marginTop: '15px',
                fontSize: '0.85rem',
                color: '#c0392b'
              }}>
                Unable to checkout: some selected items are out of stock or exceed available quantity.
              </div>
            )}

            {noItemsSelected && (
              <div style={{
                background: '#fff3cd',
                border: '1px solid #ffc107',
                borderRadius: '8px',
                padding: '10px 14px',
                marginTop: '15px',
                fontSize: '0.85rem',
                color: '#856404'
              }}>
                Please select at least one item to checkout.
              </div>
            )}

            <button
              onClick={() => navigate('/checkout', { state: { selectedItemIds: Array.from(selectedIds) } })}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: '20px', opacity: cannotCheckout ? 0.5 : 1 }}
              disabled={cannotCheckout}
            >
              Proceed to Checkout ({selectedItems.length} {selectedItems.length === 1 ? 'item' : 'items'})
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
