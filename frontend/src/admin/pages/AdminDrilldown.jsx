import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminDrilldown = () => {
  const { getToken } = useAdminAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const metric = searchParams.get('metric') || 'total_orders';
  const paymentStatus = searchParams.get('payment_status') || '';
  const sortBy = searchParams.get('sort_by') || 'date';
  const sortOrder = searchParams.get('sort_order') || 'desc';

  useEffect(() => {
    fetchDrilldownData();
  }, [metric, paymentStatus, sortBy, sortOrder]);

  const fetchDrilldownData = async () => {
    try {
      setLoading(true);
      const token = getToken();

      const params = new URLSearchParams({ metric, sort_by: sortBy, sort_order: sortOrder });
      if (paymentStatus) params.append('payment_status', paymentStatus);

      const response = await fetch(`${API_URL}/api/admin/dashboard/drilldown?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const handleSort = (field) => {
    const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSearchParams({ metric, sort_by: field, sort_order: newOrder, ...(paymentStatus && { payment_status: paymentStatus }) });
  };

  const handlePaymentFilter = (status) => {
    const params = { metric, sort_by: sortBy, sort_order: sortOrder };
    if (status) params.payment_status = status;
    setSearchParams(params);
  };

  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <span style={{ opacity: 0.3 }}>&#8597;</span>;
    return sortOrder === 'desc' ? <span>&#8595;</span> : <span>&#8593;</span>;
  };

  const getMetricConfig = () => {
    switch (metric) {
      case 'total_orders':
        return {
          title: 'Total Orders',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          ),
          color: 'blue',
        };
      case 'total_revenue':
        return {
          title: 'Total Revenue',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          ),
          color: 'green',
        };
      case 'net_earnings':
        return {
          title: 'Net Earnings',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          ),
          color: 'teal',
        };
      case 'total_fees':
        return {
          title: 'Total Fees Paid',
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          ),
          color: 'red',
        };
      default:
        return { title: 'Orders', icon: null, color: 'blue' };
    }
  };

  const config = getMetricConfig();

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        {error}
        <button onClick={fetchDrilldownData} className="btn btn-sm btn-secondary" style={{ marginLeft: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom: '16px' }}>
        <Link to="/admin" style={{ color: 'var(--admin-primary)', textDecoration: 'none' }}>
          Dashboard
        </Link>
        <span style={{ margin: '0 8px', color: 'var(--admin-text-muted)' }}>/</span>
        <span style={{ color: 'var(--admin-text)' }}>{config.title}</span>
      </nav>

      <div className="page-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className={`stat-icon ${config.color}`} style={{ width: '40px', height: '40px' }}>
            {config.icon}
          </span>
          {config.title}
        </h1>
        <div className="page-header-actions">
          <Link to="/admin" className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '16px', height: '16px' }}>
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Summary Card */}
      {data?.summary && (
        <div className="admin-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '32px' }}>
            {metric === 'total_orders' && (
              <>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Orders
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--admin-text)' }}>
                    {data.summary.totalCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Paid
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-success)' }}>
                    {data.summary.paidCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Unpaid
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-warning)' }}>
                    {data.summary.unpaidCount}
                  </div>
                </div>
              </>
            )}

            {metric === 'total_revenue' && (
              <>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Revenue
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--admin-success)' }}>
                    {formatCurrency(data.summary.totalRevenue)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Orders
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-text)' }}>
                    {data.summary.orderCount}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Avg. Order Value
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-text)' }}>
                    {formatCurrency(data.summary.averageOrderValue)}
                  </div>
                </div>
              </>
            )}

            {metric === 'net_earnings' && (
              <>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Net Earnings
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--admin-success)' }}>
                    {formatCurrency(data.summary.totalNetEarnings)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Revenue
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-text)' }}>
                    {formatCurrency(data.summary.totalRevenue)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Fees
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-danger)' }}>
                    -{formatCurrency(data.summary.totalFees)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Orders
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-text)' }}>
                    {data.summary.orderCount}
                  </div>
                </div>
              </>
            )}

            {metric === 'total_fees' && (
              <>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Fees Paid
                  </div>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: 'var(--admin-danger)' }}>
                    {formatCurrency(data.summary.totalFees)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Total Revenue
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-text)' }}>
                    {formatCurrency(data.summary.totalRevenue)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Fee %
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-text)' }}>
                    {data.summary.feePercentage}%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Orders
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: '600', color: 'var(--admin-text)' }}>
                    {data.summary.orderCount}
                  </div>
                </div>
              </>
            )}
          </div>

          {data._meta?.paidOrdersOnly && (
            <div style={{ marginTop: '16px', padding: '8px 12px', background: 'var(--admin-bg)', borderRadius: '6px', fontSize: '13px', color: 'var(--admin-text-muted)' }}>
              Only paid orders are included in this calculation
            </div>
          )}
        </div>
      )}

      {/* Filters - Only for Total Orders */}
      {metric === 'total_orders' && (
        <div className="admin-card" style={{ marginBottom: '24px', padding: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginRight: '8px' }}>Filter:</span>
            {['', 'paid', 'pending', 'failed'].map((status) => (
              <button
                key={status || 'all'}
                onClick={() => handlePaymentFilter(status)}
                style={{
                  padding: '6px 12px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  background: paymentStatus === status ? 'var(--admin-primary)' : 'var(--admin-bg)',
                  color: paymentStatus === status ? 'white' : 'var(--admin-text-muted)',
                }}
              >
                {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'All'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Orders ({data?.orders?.length || 0})</h2>
        </div>

        {data?.orders?.length === 0 ? (
          <div className="empty-state">
            <h3>No orders found</h3>
            <p>There are no orders matching this criteria.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('date')} style={{ cursor: 'pointer' }}>
                    Date <SortIcon field="date" />
                  </th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  {(metric === 'total_orders' || metric === 'total_revenue') && (
                    <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                      Order Total <SortIcon field="amount" />
                    </th>
                  )}
                  {metric === 'net_earnings' && (
                    <>
                      <th onClick={() => handleSort('amount')} style={{ cursor: 'pointer' }}>
                        Order Total <SortIcon field="amount" />
                      </th>
                      <th>SenangPay Fee</th>
                      <th>Delivery Fee</th>
                      <th onClick={() => handleSort('net')} style={{ cursor: 'pointer' }}>
                        Net Earnings <SortIcon field="net" />
                      </th>
                    </>
                  )}
                  {metric === 'total_fees' && (
                    <>
                      <th>Payment Method</th>
                      <th onClick={() => handleSort('fees')} style={{ cursor: 'pointer' }}>
                        SenangPay Fee <SortIcon field="fees" />
                      </th>
                    </>
                  )}
                  {metric === 'total_orders' && <th>Status</th>}
                </tr>
              </thead>
              <tbody>
                {data?.orders?.map((order) => (
                  <tr key={order.id} onClick={() => navigate(`/admin/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ whiteSpace: 'nowrap' }}>{formatDate(order.created_at)}</td>
                    <td><strong>#{order.id}</strong></td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{order.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                        {order.customer_email}
                      </div>
                    </td>
                    {(metric === 'total_orders' || metric === 'total_revenue') && (
                      <td style={{ fontWeight: '600' }}>
                        {formatCurrency(order.financials.orderTotal)}
                      </td>
                    )}
                    {metric === 'net_earnings' && (
                      <>
                        <td>{formatCurrency(order.financials.orderTotal)}</td>
                        <td style={{ color: 'var(--admin-danger)' }}>
                          -{formatCurrency(order.financials.senangPayFee)}
                        </td>
                        <td>{formatCurrency(order.financials.deliveryFee)}</td>
                        <td style={{ fontWeight: '600', color: 'var(--admin-success)' }}>
                          {formatCurrency(order.financials.netEarnings)}
                        </td>
                      </>
                    )}
                    {metric === 'total_fees' && (
                      <>
                        <td>
                          <span style={{ fontSize: '12px', padding: '2px 8px', background: 'var(--admin-bg)', borderRadius: '4px' }}>
                            {order.financials.senangPayFeeType || order.payment_method || 'Unknown'}
                          </span>
                        </td>
                        <td style={{ fontWeight: '600', color: 'var(--admin-danger)' }}>
                          -{formatCurrency(order.financials.senangPayFee)}
                        </td>
                      </>
                    )}
                    {metric === 'total_orders' && (
                      <td>
                        <span className={`status-badge ${order.payment_status}`}>
                          {order.payment_status}
                        </span>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDrilldown;
