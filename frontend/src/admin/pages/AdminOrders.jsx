import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminOrders = () => {
  const { getToken } = useAdminAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [pagination.page, statusFilter, paymentFilter]);

  const fetchOrders = async (searchTerm = search) => {
    try {
      setLoading(true);
      const token = getToken();

      const params = new URLSearchParams({
        page: pagination.page,
        limit: 20,
      });

      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment_status', paymentFilter);

      const response = await fetch(`${API_URL}/api/admin/orders?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch orders');

      const data = await response.json();
      setOrders(data.orders);
      setPagination(data.pagination);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchOrders(search);
  };

  const formatCurrency = (amount) => `RM ${parseFloat(amount).toFixed(2)}`;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const exportToCSV = async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (paymentFilter) params.append('payment_status', paymentFilter);

      const response = await fetch(`${API_URL}/api/admin/orders/export?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to export orders');

      const data = await response.json();

      // Convert to CSV
      const headers = [
        'Order ID', 'Date', 'Customer Name', 'Email', 'Phone', 'Address',
        'Items', 'Product Total', 'Delivery Fee', 'Order Total',
        'Payment Method', 'SenangPay Fee', 'Total Fees', 'Net Earnings',
        'Payment Status', 'Order Status', 'Transaction ID'
      ];

      const rows = data.orders.map(order => [
        order.order_id,
        order.date,
        order.customer_name,
        order.customer_email,
        order.customer_phone,
        `"${order.shipping_address?.replace(/"/g, '""') || ''}"`,
        `"${order.items?.replace(/"/g, '""') || ''}"`,
        order.product_total,
        order.delivery_fee,
        order.order_total,
        order.payment_method,
        order.senangpay_fee,
        order.total_fees,
        order.net_earnings,
        order.payment_status,
        order.order_status,
        order.transaction_id || ''
      ]);

      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

      // Download
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to export: ' + err.message);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <div className="page-header-actions">
          <button onClick={exportToCSV} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7,10 12,15 17,10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <form onSubmit={handleSearch} className="filters-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by order ID, name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="filter-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            className="filter-select"
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
          >
            <option value="">All Payments</option>
            <option value="pending">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
          </select>
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </div>

      {/* Orders Table */}
      <div className="admin-card">
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {loading ? (
          <div className="admin-loading" style={{ padding: '60px 0' }}>
            <div className="admin-spinner"></div>
            <p>Loading orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <h3>No orders found</h3>
            <p>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-container">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Contact</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Fees</th>
                    <th>Net</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)}>
                      <td><strong>#{order.id}</strong></td>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDate(order.created_at)}</td>
                      <td>
                        <div style={{ fontWeight: '500' }}>{order.customer_name}</div>
                        <div style={{ fontSize: '12px', color: '#475569' }}>
                          {order.customer_email}
                        </div>
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>{order.shipping_phone}</td>
                      <td>
                        <div style={{ fontSize: '13px' }}>
                          {order.items?.length || 0} item(s)
                        </div>
                      </td>
                      <td style={{ fontWeight: '600' }}>
                        {formatCurrency(order.financials?.orderTotal || order.total_amount)}
                      </td>
                      <td style={{ color: 'var(--admin-danger)', fontSize: '13px' }}>
                        -{formatCurrency(order.financials?.totalFees || 0)}
                      </td>
                      <td style={{ color: 'var(--admin-success)', fontWeight: '600' }}>
                        {formatCurrency(order.financials?.netEarnings || 0)}
                      </td>
                      <td>
                        <span className={`status-badge ${order.payment_status}`}>
                          {order.payment_status}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${order.status}`}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="pagination">
              <div className="pagination-info">
                Showing {((pagination.page - 1) * 20) + 1} to {Math.min(pagination.page * 20, pagination.total)} of {pagination.total} orders
              </div>
              <div className="pagination-buttons">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </button>
                <span style={{ padding: '0 12px', lineHeight: '32px' }}>
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page >= pagination.totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
