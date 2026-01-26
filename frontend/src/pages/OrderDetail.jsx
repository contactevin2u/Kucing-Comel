import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const OrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrderDetails();
  }, [id, isAuthenticated, navigate]);

  // Auto-trigger payment if ?pay=true is in URL
  useEffect(() => {
    if (searchParams.get('pay') === 'true' && order && order.payment_status !== 'paid' && !paymentProcessing) {
      handlePayNow();
    }
  }, [order, searchParams]);

  const handlePayNow = async () => {
    if (paymentProcessing) return;

    setPaymentProcessing(true);
    try {
      const response = await api.initiateSenangPayPayment(order.id);
      if (response.redirect_url) {
        window.location.href = response.redirect_url;
      }
    } catch (err) {
      console.error('Payment initiation failed:', err);
      setError('Failed to initiate payment. Please try again.');
      setPaymentProcessing(false);
    }
  };

  const fetchOrderDetails = async () => {
    try {
      const data = await api.getOrder(id);
      setOrder(data.order);
    } catch (err) {
      console.error('Failed to fetch order:', err);
      setError('Order not found or access denied.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'pending': return 'pending';
      case 'confirmed': return 'confirmed';
      case 'processing': return 'confirmed';
      case 'shipped': return 'shipped';
      case 'delivered': return 'delivered';
      case 'cancelled': return 'cancelled';
      default: return '';
    }
  };

  const getStatusLabel = (status) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  if (!isAuthenticated) return null;

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="orders-page">
        <div className="container">
          <div className="cart-empty">
            <h2>{error || 'Order not found'}</h2>
            <Link to="/orders" className="btn btn-primary" style={{ marginTop: '20px' }}>
              Back to Orders
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const subtotal = order.items?.reduce(
    (sum, item) => sum + parseFloat(item.product_price) * item.quantity,
    0
  ) || parseFloat(order.total_amount);

  return (
    <div className="orders-page">
      <div className="container">
        <button
          onClick={() => navigate('/orders')}
          className="btn btn-outline btn-sm"
          style={{ marginBottom: '20px' }}
        >
          ← Back to Orders
        </button>

        <div className="order-detail-header">
          <h1>Order #{order.id}</h1>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
            <span className={`order-status ${getStatusClass(order.status)}`}>
              {getStatusLabel(order.status)}
            </span>
            <span className={`order-status ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
              {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
            </span>
          </div>
        </div>

        <div className="order-detail-grid">
          {/* Order Info */}
          <div className="order-detail-section">
            <h3>Order Information</h3>
            <div className="order-info-row">
              <span className="label">Order Number:</span>
              <span className="value">#{order.id}</span>
            </div>
            <div className="order-info-row">
              <span className="label">Order Date:</span>
              <span className="value">{formatDate(order.created_at)}</span>
            </div>
            <div className="order-info-row">
              <span className="label">Order Status:</span>
              <span className={`order-status ${getStatusClass(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div className="order-info-row">
              <span className="label">Payment Status:</span>
              <span className={`order-status ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
              </span>
            </div>
            {order.transaction_id && (
              <div className="order-info-row">
                <span className="label">Transaction ID:</span>
                <span className="value">{order.transaction_id}</span>
              </div>
            )}
          </div>

          {/* Shipping Info */}
          <div className="order-detail-section">
            <h3>Shipping Address</h3>
            <div className="shipping-address">
              <p className="name">{order.shipping_name}</p>
              <p>{order.shipping_address}</p>
              <p>Phone: {order.shipping_phone}</p>
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="order-detail-section" style={{ marginTop: '20px' }}>
          <h3>Order Items</h3>
          <div className="order-items-table">
            <div className="order-items-header">
              <span className="item-name">Product</span>
              <span className="item-qty">Qty</span>
              <span className="item-price">Price</span>
              <span className="item-total">Total</span>
            </div>
            {order.items?.map((item) => (
              <div key={item.id} className="order-item-row">
                <span className="item-name">
                  {item.product_name}
                  {item.variant_name && <span className="variant"> ({item.variant_name})</span>}
                </span>
                <span className="item-qty">{item.quantity}</span>
                <span className="item-price">RM {parseFloat(item.product_price).toFixed(2)}</span>
                <span className="item-total">RM {(parseFloat(item.product_price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="order-summary-section">
          <div className="summary-row">
            <span>Subtotal</span>
            <span>RM {subtotal.toFixed(2)}</span>
          </div>
          <div className="summary-row">
            <span>Shipping</span>
            <span style={{ color: '#27AE60' }}>FREE</span>
          </div>
          <div className="summary-row summary-total">
            <span>Total</span>
            <span>RM {parseFloat(order.total_amount).toFixed(2)}</span>
          </div>

          {order.payment_status !== 'paid' && (
            <button
              className="btn btn-primary"
              onClick={handlePayNow}
              disabled={paymentProcessing}
              style={{ width: '100%', marginTop: '20px', padding: '15px' }}
            >
              {paymentProcessing ? 'Processing...' : 'Pay Now'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
