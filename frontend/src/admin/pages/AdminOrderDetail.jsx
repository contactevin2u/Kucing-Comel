import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminOrderDetail = () => {
  const { id } = useParams();
  const { getToken } = useAdminAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');

  // Status update state
  const [newStatus, setNewStatus] = useState('');
  const [newPaymentStatus, setNewPaymentStatus] = useState('');

  useEffect(() => {
    fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      setLoading(true);
      const token = getToken();

      const response = await fetch(`${API_URL}/api/admin/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch order');

      const data = await response.json();
      setOrder(data.order);
      setNewStatus(data.order.status);
      setNewPaymentStatus(data.order.payment_status);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async () => {
    try {
      setUpdating(true);
      setMessage('');
      const token = getToken();

      const body = {};
      if (newStatus !== order.status) body.status = newStatus;
      if (newPaymentStatus !== order.payment_status) body.payment_status = newPaymentStatus;

      if (Object.keys(body).length === 0) {
        setMessage('No changes to save.');
        return;
      }

      const response = await fetch(`${API_URL}/api/admin/orders/${id}/status`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error('Failed to update order');

      const data = await response.json();
      setOrder(data.order);
      setMessage('Order updated successfully!');
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount) => `RM ${parseFloat(amount || 0).toFixed(2)}`;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading order...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link to="/admin/orders" className="back-link">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Orders
        </Link>
        <div className="alert alert-error">{error}</div>
      </div>
    );
  }

  if (!order) return null;

  const { financials } = order;

  return (
    <div>
      <Link to="/admin/orders" className="back-link">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Orders
      </Link>

      <div className="page-header">
        <h1>Order #{order.id}</h1>
        <div className="page-header-actions">
          <button onClick={() => window.print()} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 6 2 18 2 18 9" />
              <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
              <rect x="6" y="14" width="12" height="8" />
            </svg>
            Print
          </button>
        </div>
      </div>

      {message && (
        <div className="alert alert-success">{message}</div>
      )}

      <div className="order-detail-grid">
        {/* Left Column - Order Info */}
        <div>
          {/* Customer Information */}
          <div className="admin-card order-section">
            <h3>Customer Information</h3>
            <div className="order-info-grid">
              <div className="order-info-item">
                <span className="order-info-label">Name</span>
                <span className="order-info-value">{order.customer_name || order.shipping_name}</span>
              </div>
              <div className="order-info-item">
                <span className="order-info-label">Email</span>
                <span className="order-info-value">{order.customer_email || order.guest_email || 'N/A'}</span>
              </div>
              <div className="order-info-item">
                <span className="order-info-label">Phone</span>
                <span className="order-info-value">{order.shipping_phone}</span>
              </div>
              <div className="order-info-item">
                <span className="order-info-label">Customer Type</span>
                <span className="order-info-value">{order.user_id ? 'Registered' : 'Guest'}</span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="admin-card order-section">
            <h3>Shipping Address</h3>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
              {order.shipping_name}<br />
              {order.shipping_address}<br />
              {order.shipping_phone}
            </p>
          </div>

          {/* Order Items */}
          <div className="admin-card order-section">
            <h3>Order Items</h3>
            <div className="order-items-list">
              {order.items?.map((item, index) => (
                <div key={index} className="order-item">
                  <div className="order-item-info">
                    <span className="order-item-name">{item.product_name}</span>
                    {item.variant_name && (
                      <span className="order-item-variant">Variant: {item.variant_name}</span>
                    )}
                    <span className="order-item-qty">Qty: {item.quantity} x {formatCurrency(item.product_price)}</span>
                  </div>
                  <span className="order-item-price">
                    {formatCurrency(item.product_price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Order Timeline */}
          <div className="admin-card order-section">
            <h3>Order Details</h3>
            <div className="order-info-grid">
              <div className="order-info-item">
                <span className="order-info-label">Order Date</span>
                <span className="order-info-value">{formatDate(order.created_at)}</span>
              </div>
              <div className="order-info-item">
                <span className="order-info-label">Payment Method</span>
                <span className="order-info-value">{order.payment_method || 'SenangPay'}</span>
              </div>
              <div className="order-info-item">
                <span className="order-info-label">Transaction ID</span>
                <span className="order-info-value">{order.transaction_id || 'N/A'}</span>
              </div>
              <div className="order-info-item">
                <span className="order-info-label">Payment Reference</span>
                <span className="order-info-value">{order.payment_reference || 'N/A'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Financials & Status */}
        <div>
          {/* Status Update */}
          <div className="admin-card order-section">
            <h3>Order Status</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                <span className={`status-badge ${order.status}`}>{order.status}</span>
                <span className={`status-badge ${order.payment_status}`}>{order.payment_status}</span>
              </div>
            </div>

            <div className="status-update-section" style={{ flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--admin-text-muted)' }}>
                  Order Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="processing">Processing</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '6px', color: 'var(--admin-text-muted)' }}>
                  Payment Status
                </label>
                <select
                  value={newPaymentStatus}
                  onChange={(e) => setNewPaymentStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--admin-border)' }}
                >
                  <option value="pending">Pending</option>
                  <option value="paid">Paid</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </select>
              </div>

              <button
                onClick={updateStatus}
                disabled={updating}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="admin-card order-section">
            <h3>Financial Breakdown</h3>
            <div className="financial-breakdown">
              <div className="financial-row">
                <span className="financial-label">Product Total</span>
                <span className="financial-value">{formatCurrency(financials?.productTotal)}</span>
              </div>
              <div className="financial-row">
                <span className="financial-label">Delivery Fee</span>
                <span className="financial-value">{formatCurrency(financials?.deliveryFee)}</span>
              </div>
              <div className="financial-row" style={{ fontWeight: '600', borderTop: '1px solid var(--admin-border)', paddingTop: '12px', marginTop: '4px' }}>
                <span className="financial-label">Order Total</span>
                <span className="financial-value">{formatCurrency(financials?.orderTotal)}</span>
              </div>

              <div style={{ margin: '16px 0', paddingTop: '16px', borderTop: '1px dashed var(--admin-border)' }}>
                <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', marginBottom: '8px', fontWeight: '600' }}>
                  FEES DEDUCTED
                </div>
              </div>

              <div className="financial-row fee">
                <span className="financial-label">
                  SenangPay Fee ({financials?.senangPayFeeType})
                  <br />
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>
                    {financials?.senangPayFeePercentage}% or RM {financials?.senangPayFeeMinimum?.toFixed(2)} min
                  </span>
                </span>
                <span className="financial-value">-{formatCurrency(financials?.senangPayFee)}</span>
              </div>

              {financials?.otherFees > 0 && (
                <div className="financial-row fee">
                  <span className="financial-label">Other Fees</span>
                  <span className="financial-value">-{formatCurrency(financials?.otherFees)}</span>
                </div>
              )}

              <div className="financial-row fee" style={{ fontWeight: '600' }}>
                <span className="financial-label">Total Fees</span>
                <span className="financial-value">-{formatCurrency(financials?.totalFees)}</span>
              </div>

              <div className="financial-row total">
                <span className="financial-label">Net Earnings</span>
                <span className="financial-value">{formatCurrency(financials?.netEarnings)}</span>
              </div>
            </div>
          </div>

          {/* Quick Info */}
          <div className="admin-card order-section">
            <h3>Fee Calculation Details</h3>
            <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', lineHeight: '1.6' }}>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Payment Method:</strong> {financials?.senangPayFeeType}
              </p>
              <p style={{ margin: '0 0 8px 0' }}>
                <strong>Fee Rate:</strong> {financials?.senangPayFeePercentage}% or RM {financials?.senangPayFeeMinimum?.toFixed(2)} minimum
              </p>
              <p style={{ margin: '0' }}>
                <strong>Applied:</strong> {financials?.senangPayFeeCalculatedFrom === 'percentage' ? 'Percentage rate' : 'Minimum fee'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminOrderDetail;
