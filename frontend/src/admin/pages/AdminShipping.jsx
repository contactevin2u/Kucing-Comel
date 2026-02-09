import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../AdminApp';

const AdminShipping = () => {
  const { getToken } = useAdminAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trackingInputs, setTrackingInputs] = useState({});
  const [savingTracking, setSavingTracking] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  useEffect(() => {
    fetchShippingOrders();
  }, []);

  const fetchShippingOrders = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/admin/orders/shipping`, {
        headers: {
          'Authorization': `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch shipping orders');
      }

      const data = await response.json();
      setOrders(data.orders);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTrackingChange = (orderId, value) => {
    setTrackingInputs(prev => ({
      ...prev,
      [orderId]: value,
    }));
  };

  const handleMarkShipped = async (orderId) => {
    const trackingNumber = trackingInputs[orderId];

    if (!trackingNumber || trackingNumber.trim() === '') {
      alert('Please enter a tracking number');
      return;
    }

    try {
      setSavingTracking(prev => ({ ...prev, [orderId]: true }));

      const response = await fetch(`${API_URL}/api/admin/orders/${orderId}/tracking`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${getToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tracking_number: trackingNumber.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tracking');
      }

      // Remove order from list (it's now shipped)
      setOrders(prev => prev.filter(o => o.id !== orderId));
      setTrackingInputs(prev => {
        const newInputs = { ...prev };
        delete newInputs[orderId];
        return newInputs;
      });
      setSuccessMessage(`Order #${orderId} marked as shipped!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSavingTracking(prev => ({ ...prev, [orderId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading shipping orders...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="page-header">
        <h1>Shipping Management</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={async () => {
              try {
                const response = await fetch(`${API_URL}/api/admin/orders/export-spx`, {
                  headers: { 'Authorization': `Bearer ${getToken()}` },
                });
                if (!response.ok) throw new Error('Export failed');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `spx_orders_${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);
                setSuccessMessage('SPX Excel exported successfully!');
                setTimeout(() => setSuccessMessage(''), 3000);
              } catch (err) {
                alert('Export failed: ' + err.message);
              }
            }}
            className="btn-export-spx"
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#FF5722',
              color: '#fff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: 8 }}>
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Export SPX Excel
          </button>
          <button onClick={fetchShippingOrders} className="btn-refresh">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, marginRight: 8 }}>
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 20 }}>
          {error}
        </div>
      )}

      {successMessage && (
        <div className="alert alert-success" style={{ marginBottom: 20, background: '#e8f5e9', color: '#2e7d32', padding: '12px 20px', borderRadius: 8 }}>
          {successMessage}
        </div>
      )}

      <div className="info-box" style={{ marginBottom: 20, padding: 15, background: '#e3f2fd', borderRadius: 8, fontSize: '0.9rem' }}>
        <strong>Workflow:</strong>
        <ol style={{ margin: '5px 0 0 20px', paddingLeft: 0 }}>
          <li>Click "Export SPX Excel" to download all orders</li>
          <li>Go to <a href="https://spx.com.my/spx-admin/mass-order/create" target="_blank" rel="noopener noreferrer">SPX Mass Order</a> and upload the Excel file</li>
          <li>After SPX processes, enter tracking numbers below and click "Ship"</li>
        </ol>
      </div>

      {orders.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: 60, color: '#666' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 64, height: 64, marginBottom: 20, opacity: 0.5 }}>
            <path d="M9 17H4a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-5" />
            <path d="M12 15l-3 6h6l-3-6z" />
          </svg>
          <h3>No orders to ship</h3>
          <p>All paid orders have been shipped or are awaiting payment.</p>
        </div>
      ) : (
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Postcode</th>
                <th>Weight (kg)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td>
                    <a href={`/admin/orders/${order.id}`} style={{ color: '#2196F3', fontWeight: 600 }}>
                      #{order.id}
                    </a>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{order.customer_name}</div>
                    <div style={{ fontSize: '0.85rem', color: '#666' }}>{order.customer_email}</div>
                  </td>
                  <td style={{ whiteSpace: 'nowrap' }}>{order.shipping_phone}</td>
                  <td style={{ maxWidth: 250, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {order.shipping_address}
                  </td>
                  <td>
                    <span style={{
                      background: order.shipping_postcode ? '#e8f5e9' : '#fff3e0',
                      color: order.shipping_postcode ? '#2e7d32' : '#e65100',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontSize: '0.85rem',
                      fontFamily: 'monospace'
                    }}>
                      {order.shipping_postcode || 'N/A'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span style={{
                      background: '#f5f5f5',
                      padding: '4px 8px',
                      borderRadius: 4,
                      fontFamily: 'monospace'
                    }}>
                      {order.total_weight}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, minWidth: 200 }}>
                        <input
                          type="text"
                          placeholder="Tracking #"
                          value={trackingInputs[order.id] || ''}
                          onChange={(e) => handleTrackingChange(order.id, e.target.value)}
                          style={{
                            flex: 1,
                            padding: '8px 10px',
                            border: '1px solid #ddd',
                            borderRadius: 6,
                            fontSize: '0.9rem'
                          }}
                        />
                        <button
                          onClick={() => handleMarkShipped(order.id)}
                          disabled={savingTracking[order.id]}
                          style={{
                            background: '#4CAF50',
                            color: '#fff',
                            border: 'none',
                            padding: '8px 12px',
                            borderRadius: 6,
                            cursor: savingTracking[order.id] ? 'not-allowed' : 'pointer',
                            fontWeight: 500,
                            opacity: savingTracking[order.id] ? 0.7 : 1
                          }}
                        >
                          {savingTracking[order.id] ? '...' : 'Ship'}
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`
        .btn-refresh {
          display: flex;
          align-items: center;
          background: #fff;
          border: 1px solid #ddd;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        .btn-refresh:hover {
          background: #f5f5f5;
        }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .admin-table th {
          background: #f8f9fa;
          padding: 12px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 0.85rem;
          color: #555;
          border-bottom: 2px solid #eee;
        }
        .admin-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #eee;
          vertical-align: top;
        }
        .admin-table tr:hover {
          background: #f8f9fa;
        }
      `}</style>
    </div>
  );
};

export default AdminShipping;
