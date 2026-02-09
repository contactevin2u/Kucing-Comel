import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminCustomers = () => {
  const { getToken } = useAdminAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const token = getToken();

      const response = await fetch(`${API_URL}/api/admin/customers`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch customers');

      const data = await response.json();
      setCustomers(data.customers);
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
    });
  };

  const filteredCustomers = customers.filter(customer => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.phone?.includes(search)
    );
  });

  return (
    <div>
      <div className="page-header">
        <h1>Customers</h1>
      </div>

      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-icon blue">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{customers.length}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon green">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Customer Spend</div>
            <div className="stat-value">
              {formatCurrency(customers.reduce((sum, c) => sum + c.total_spent, 0))}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon purple">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-label">Total Orders</div>
            <div className="stat-value">
              {customers.reduce((sum, c) => sum + c.total_orders, 0)}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="admin-card" style={{ marginBottom: '24px' }}>
        <div className="filters-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="admin-card">
        {error && (
          <div className="alert alert-error">{error}</div>
        )}

        {loading ? (
          <div className="admin-loading" style={{ padding: '60px 0' }}>
            <div className="admin-spinner"></div>
            <p>Loading customers...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
            </svg>
            <h3>No customers found</h3>
            <p>{search ? 'Try adjusting your search.' : 'Customers will appear here once they register.'}</p>
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Contact</th>
                  <th>Joined</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Avg. Order</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} style={{ cursor: 'default' }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: 'var(--admin-primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          {customer.name?.charAt(0)?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <div style={{ fontWeight: '500' }}>{customer.name}</div>
                          <div style={{ fontSize: '12px', color: '#475569' }}>
                            ID: {customer.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div>{customer.email}</div>
                      <div style={{ fontSize: '12px', color: '#475569' }}>
                        {customer.phone || 'No phone'}
                      </div>
                    </td>
                    <td>{formatDate(customer.created_at)}</td>
                    <td>
                      <strong>{customer.total_orders}</strong>
                    </td>
                    <td style={{ fontWeight: '600', color: 'var(--admin-success)' }}>
                      {formatCurrency(customer.total_spent)}
                    </td>
                    <td>
                      {customer.total_orders > 0
                        ? formatCurrency(customer.total_spent / customer.total_orders)
                        : '-'}
                    </td>
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

export default AdminCustomers;
