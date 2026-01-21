import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Orders = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(location.state?.message || null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    fetchOrders();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data.orders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
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
      default: return '';
    }
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
    <div className="orders-page">
      <div className="container">
        <h1 style={{ marginBottom: '30px' }}>My Orders</h1>

        {message && (
          <div className="alert alert-success">{message}</div>
        )}

        {orders.length === 0 ? (
          <div className="cart-empty">
            <h2>No orders yet</h2>
            <p style={{ color: '#95A5A6', marginBottom: '20px' }}>
              Start shopping to see your orders here
            </p>
            <Link to="/" className="btn btn-primary">
              Start Shopping
            </Link>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <span className="order-id">Order #{order.id}</span>
                  <span style={{ color: '#95A5A6', marginLeft: '15px', fontSize: '0.9rem' }}>
                    {formatDate(order.created_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span className={`order-status ${getStatusClass(order.status)}`}>
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </span>
                  <span className={`order-status ${order.payment_status === 'paid' ? 'paid' : 'pending'}`}>
                    {order.payment_status === 'paid' ? 'Paid' : 'Unpaid'}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '15px' }}>
                {order.items?.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: '1px solid #F7F9FC'
                  }}>
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <span>
                      RM {(parseFloat(item.product_price) * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '15px',
                borderTop: '2px solid #F7F9FC'
              }}>
                <div style={{ color: '#95A5A6', fontSize: '0.9rem' }}>
                  <strong>Ship to:</strong> {order.shipping_name}<br />
                  {order.shipping_address}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#95A5A6' }}>Total</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: '700', color: '#FF6B6B' }}>
                    RM {parseFloat(order.total_amount).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Orders;
