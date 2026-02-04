import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminDashboard = () => {
  const { getToken } = useAdminAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [periodStats, setPeriodStats] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('monthly');
  const [availablePeriods, setAvailablePeriods] = useState({ months: [], years: [] });
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [periodSummary, setPeriodSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Navigate to drill-down page
  const handleMetricClick = (metric) => {
    navigate(`/admin/drilldown?metric=${metric}`);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedPeriod === 'monthly' && selectedMonth) {
      fetchMonthDetail();
    } else if (selectedPeriod === 'yearly' && selectedYear) {
      fetchYearDetail();
    }
  }, [selectedPeriod, selectedMonth, selectedYear]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = getToken();

      // Fetch summary, orders, and available periods
      const [summaryRes, ordersRes, periodsRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/orders?limit=5`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/stats/available-periods`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!summaryRes.ok) throw new Error('Failed to fetch dashboard data');

      const summaryData = await summaryRes.json();
      const ordersData = await ordersRes.json();
      const periodsData = await periodsRes.json();

      setDashboard(summaryData);
      setRecentOrders(ordersData.orders || []);
      setAvailablePeriods(periodsData);

      // Set default selections to most recent
      if (periodsData.months?.length > 0) {
        const latest = periodsData.months[0];
        setSelectedMonth({ year: latest.year, month: latest.month });
      }
      if (periodsData.years?.length > 0) {
        setSelectedYear(periodsData.years[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthDetail = async () => {
    if (!selectedMonth) return;
    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/admin/stats/month-detail?year=${selectedMonth.year}&month=${selectedMonth.month}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setPeriodStats(data.dailyStats || []);
        setPeriodSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch month detail:', err);
    }
  };

  const fetchYearDetail = async () => {
    if (!selectedYear) return;
    try {
      const token = getToken();
      const res = await fetch(
        `${API_URL}/api/admin/stats/year-detail?year=${selectedYear}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.ok) {
        const data = await res.json();
        setPeriodStats(data.monthlyStats || []);
        setPeriodSummary(data.summary);
      }
    } catch (err) {
      console.error('Failed to fetch year detail:', err);
    }
  };

  const formatCurrency = (amount) => {
    return `RM ${parseFloat(amount).toFixed(2)}`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShortDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatPeriodLabel = (dateString, period) => {
    const date = new Date(dateString);
    switch (period) {
      case 'weekly':
        return `Week of ${date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' })}`;
      case 'monthly':
        return date.toLocaleDateString('en-MY', { month: 'short', year: 'numeric' });
      case 'yearly':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
    }
  };

  const formatShortPeriodLabel = (dateString, period) => {
    const date = new Date(dateString);
    switch (period) {
      case 'weekly':
        return date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
      case 'monthly':
        return date.toLocaleDateString('en-MY', { month: 'short', year: '2-digit' });
      case 'yearly':
        return date.getFullYear().toString();
      default:
        return date.toLocaleDateString('en-MY', { month: 'short', day: 'numeric' });
    }
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

  const getPeriodTitle = () => {
    if (selectedPeriod === 'monthly' && selectedMonth) {
      return `${monthNames[selectedMonth.month - 1]} ${selectedMonth.year}`;
    }
    if (selectedPeriod === 'yearly' && selectedYear) {
      return `Year ${selectedYear}`;
    }
    return selectedPeriod === 'monthly' ? 'Monthly' : 'Yearly';
  };

  const getPeriodCount = () => {
    if (selectedPeriod === 'monthly' && selectedMonth) {
      return `${monthNames[selectedMonth.month - 1]} ${selectedMonth.year}`;
    }
    if (selectedPeriod === 'yearly' && selectedYear) {
      return selectedYear;
    }
    return '';
  };

  const getPreviousPeriodLabel = () => {
    if (selectedPeriod === 'monthly' && selectedMonth) {
      const prevMonth = selectedMonth.month === 1 ? 12 : selectedMonth.month - 1;
      const prevYear = selectedMonth.month === 1 ? selectedMonth.year - 1 : selectedMonth.year;
      return `${monthNames[prevMonth - 1]} ${prevYear}`;
    }
    if (selectedPeriod === 'yearly' && selectedYear) {
      return selectedYear - 1;
    }
    return 'Previous';
  };

  // Change indicator component
  const ChangeIndicator = ({ value, suffix = '%' }) => {
    if (value === 0) return <span style={{ color: 'var(--admin-text-muted)', fontSize: '12px' }}>No change</span>;
    const isPositive = value > 0;
    return (
      <span style={{
        color: isPositive ? 'var(--admin-success)' : 'var(--admin-danger)',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '2px'
      }}>
        {isPositive ? '↑' : '↓'} {Math.abs(value)}{suffix}
      </span>
    );
  };

  // Comparison card component
  const ComparisonCard = ({ title, current, previous, currentLabel, previousLabel }) => (
    <div className="admin-card" style={{ padding: '20px' }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: '500' }}>
        {title}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            {currentLabel}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-text)' }}>
            {formatCurrency(current.revenue)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
            {current.orders} orders
          </div>
          {current.revenueChange !== undefined && (
            <div style={{ marginTop: '8px' }}>
              <ChangeIndicator value={current.revenueChange} />
            </div>
          )}
        </div>
        <div style={{ borderLeft: '1px solid var(--admin-border)', paddingLeft: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
            {previousLabel}
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--admin-text-muted)' }}>
            {formatCurrency(previous.revenue)}
          </div>
          <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
            {previous.orders} orders
          </div>
        </div>
      </div>
    </div>
  );

  // Simple bar chart component
  const SimpleBarChart = ({ data, maxBars = 14, period = 'daily' }) => {
    const chartData = data.slice(0, maxBars).reverse();
    const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);
    const dateKey = period === 'weekly' ? 'week' : period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'date';

    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '120px', padding: '0 4px' }}>
        {chartData.map((item, index) => {
          const height = (item.revenue / maxRevenue) * 100;
          const dateValue = item[dateKey] || item.date || item.week || item.month || item.year;
          return (
            <div
              key={index}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(height, 2)}%`,
                  background: item.revenue > 0 ? 'var(--admin-primary)' : 'var(--admin-border)',
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                  transition: 'height 0.3s ease',
                }}
                title={`${formatPeriodLabel(dateValue, period)}: ${formatCurrency(item.revenue)} (${item.orders} orders)`}
              />
              <span style={{ fontSize: '9px', color: 'var(--admin-text-muted)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap' }}>
                {formatShortPeriodLabel(dateValue, period)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        {error}
        <button onClick={fetchDashboardData} className="btn btn-sm btn-secondary" style={{ marginLeft: '10px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <div className="page-header-actions">
          <button onClick={fetchDashboardData} className="btn btn-secondary">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M23 4v6h-6M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Main Stats - Clickable Cards */}
      <div className="stats-grid">
        <div className="stat-card stat-card-clickable" onClick={() => handleMetricClick('total_orders')}>
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">{dashboard.summary.totalOrders}</div>
            <div className="stat-change positive">
              {dashboard.summary.paidOrders} paid
            </div>
          </div>
          <div className="stat-card-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        <div className="stat-card stat-card-clickable" onClick={() => handleMetricClick('total_revenue')}>
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Revenue</div>
            <div className="stat-value">{formatCurrency(dashboard.summary.totalRevenue)}</div>
            <div className="stat-change">All time</div>
          </div>
          <div className="stat-card-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        <div className="stat-card stat-card-clickable" onClick={() => handleMetricClick('net_earnings')}>
          <div className="stat-icon teal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Net Earnings</div>
            <div className="stat-value">{formatCurrency(dashboard.summary.totalNetEarnings)}</div>
            <div className="stat-change">After all fees</div>
          </div>
          <div className="stat-card-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>

        <div className="stat-card stat-card-clickable" onClick={() => handleMetricClick('total_fees')}>
          <div className="stat-icon red">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
              <line x1="1" y1="10" x2="23" y2="10" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Fees Paid</div>
            <div className="stat-value">{formatCurrency(dashboard.summary.totalSenangPayFees)}</div>
            <div className="stat-change negative">SenangPay fees</div>
          </div>
          <div className="stat-card-arrow">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </div>
        </div>
      </div>

      {/* Period Comparisons */}
      <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '32px 0 16px 0', color: 'var(--admin-text)' }}>
        Period Comparisons
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <ComparisonCard
          title="Daily Comparison"
          current={dashboard.today}
          previous={dashboard.yesterday}
          currentLabel="Today"
          previousLabel="Yesterday"
        />
        <ComparisonCard
          title="Weekly Comparison"
          current={dashboard.thisWeek}
          previous={dashboard.lastWeek}
          currentLabel="This Week"
          previousLabel="Last Week"
        />
        <ComparisonCard
          title="Monthly Comparison"
          current={dashboard.thisMonth}
          previous={dashboard.lastMonth}
          currentLabel="This Month"
          previousLabel="Last Month"
        />
      </div>

      {/* Period Selector */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '32px 0 16px 0', flexWrap: 'wrap', gap: '16px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: 'var(--admin-text)' }}>
          Revenue Trend {getPeriodCount() && `(${getPeriodCount()})`}
        </h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Period Type Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {['monthly', 'yearly'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedPeriod(period)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '500',
                  background: selectedPeriod === period ? 'var(--admin-primary)' : 'var(--admin-card-bg)',
                  color: selectedPeriod === period ? 'white' : 'var(--admin-text-muted)',
                  transition: 'all 0.2s ease',
                }}
              >
                {period === 'monthly' ? 'By Month' : 'By Year'}
              </button>
            ))}
          </div>

          {/* Month Dropdown */}
          {selectedPeriod === 'monthly' && availablePeriods.months?.length > 0 && (
            <select
              value={selectedMonth ? `${selectedMonth.year}-${selectedMonth.month}` : ''}
              onChange={(e) => {
                const [year, month] = e.target.value.split('-').map(Number);
                setSelectedMonth({ year, month });
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--admin-border)',
                background: 'var(--admin-card-bg)',
                color: 'var(--admin-text)',
                fontSize: '13px',
                cursor: 'pointer',
                minWidth: '160px',
              }}
            >
              {availablePeriods.months.map((m) => (
                <option key={`${m.year}-${m.month}`} value={`${m.year}-${m.month}`}>
                  {monthNames[m.month - 1]} {m.year}
                </option>
              ))}
            </select>
          )}

          {/* Year Dropdown */}
          {selectedPeriod === 'yearly' && availablePeriods.years?.length > 0 && (
            <select
              value={selectedYear || ''}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid var(--admin-border)',
                background: 'var(--admin-card-bg)',
                color: 'var(--admin-text)',
                fontSize: '13px',
                cursor: 'pointer',
                minWidth: '100px',
              }}
            >
              {availablePeriods.years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Period Comparison Summary */}
      {periodSummary && (
        <div className="admin-card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--admin-text-muted)', fontWeight: '500' }}>
            Period Comparison
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                {getPeriodTitle()}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--admin-text)' }}>
                {formatCurrency(periodSummary.current.revenue)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                {periodSummary.current.orders} orders ({periodSummary.current.paidOrders} paid)
              </div>
              {periodSummary.previous.revenue > 0 && (
                <div style={{ marginTop: '8px' }}>
                  <ChangeIndicator
                    value={Math.round(((periodSummary.current.revenue - periodSummary.previous.revenue) / periodSummary.previous.revenue) * 100)}
                  />
                </div>
              )}
            </div>
            <div style={{ borderLeft: '1px solid var(--admin-border)', paddingLeft: '24px' }}>
              <div style={{ fontSize: '11px', color: 'var(--admin-text-muted)', marginBottom: '4px', textTransform: 'uppercase' }}>
                {getPreviousPeriodLabel()}
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: 'var(--admin-text-muted)' }}>
                {formatCurrency(periodSummary.previous.revenue)}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', marginTop: '4px' }}>
                {periodSummary.previous.orders} orders ({periodSummary.previous.paidOrders} paid)
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Trend Chart */}
      {periodStats.length > 0 && (
        <div className="admin-card" style={{ marginBottom: '24px' }}>
          <div className="admin-card-header">
            <h2>{selectedPeriod === 'monthly' ? 'Daily' : 'Monthly'} Breakdown</h2>
          </div>
          <SimpleBarChart data={periodStats} period={selectedPeriod === 'monthly' ? 'daily' : 'monthly'} maxBars={selectedPeriod === 'yearly' ? 12 : 31} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px', padding: '16px', background: 'var(--admin-bg)', borderRadius: '8px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Total Revenue</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {formatCurrency(periodStats.reduce((sum, d) => sum + d.revenue, 0))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Average {selectedPeriod === 'monthly' ? 'Daily' : 'Monthly'}</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {formatCurrency(periodStats.reduce((sum, d) => sum + d.revenue, 0) / Math.max(periodStats.length, 1))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Total Orders</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {periodStats.reduce((sum, d) => sum + d.orders, 0)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>Best {selectedPeriod === 'monthly' ? 'Day' : 'Month'}</div>
              <div style={{ fontSize: '20px', fontWeight: '700' }}>
                {formatCurrency(Math.max(...periodStats.map(d => d.revenue), 0))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Breakdown Table */}
      {periodStats.length > 0 && (
        <div className="admin-card" style={{ marginBottom: '24px' }}>
          <div className="admin-card-header">
            <h2>{selectedPeriod === 'monthly' ? 'Daily' : 'Monthly'} Details</h2>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{selectedPeriod === 'monthly' ? 'Date' : 'Month'}</th>
                  <th>Orders</th>
                  <th>Paid Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {periodStats.map((item, index) => {
                  const dateValue = item.date || item.month;
                  const displayPeriod = selectedPeriod === 'monthly' ? 'daily' : 'monthly';
                  return (
                    <tr key={index} style={{ cursor: 'default' }}>
                      <td>
                        <strong>{formatPeriodLabel(dateValue, displayPeriod)}</strong>
                        {index === 0 && <span style={{ marginLeft: '8px', fontSize: '11px', color: 'var(--admin-primary)' }}>Latest</span>}
                      </td>
                      <td>{item.orders}</td>
                      <td>{item.paidOrders}</td>
                      <td style={{ fontWeight: '600', color: item.revenue > 0 ? 'var(--admin-success)' : 'var(--admin-text-muted)' }}>
                        {formatCurrency(item.revenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      <div className="admin-card">
        <div className="admin-card-header">
          <h2>Recent Orders</h2>
          <Link to="/admin/orders" className="btn btn-sm btn-secondary">
            View All
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            <h3>No orders yet</h3>
            <p>Orders will appear here once customers start purchasing.</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Net Earnings</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order) => (
                  <tr key={order.id} onClick={() => window.location.href = `/admin/orders/${order.id}`}>
                    <td><strong>#{order.id}</strong></td>
                    <td>
                      <div>{order.customer_name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                        {order.customer_email}
                      </div>
                    </td>
                    <td>{formatCurrency(order.financials?.orderTotal || order.total_amount)}</td>
                    <td style={{ color: 'var(--admin-success)', fontWeight: '600' }}>
                      {formatCurrency(order.financials?.netEarnings || 0)}
                    </td>
                    <td>
                      <span className={`status-badge ${order.status}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${order.payment_status}`}>
                        {order.payment_status}
                      </span>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
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

export default AdminDashboard;
