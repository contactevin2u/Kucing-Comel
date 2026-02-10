import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminVouchers = () => {
  const { getToken } = useAdminAuth();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'fixed',
    discount_amount: '',
    max_discount: '',
    min_order_amount: '',
    start_date: '',
    expiry_date: '',
    usage_limit: '',
    once_per_user: true,
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchVouchers();
  }, []);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/vouchers`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch vouchers');

      const data = await response.json();
      setVouchers(data.vouchers);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingVoucher(null);
    setFormData({
      code: '',
      discount_type: 'fixed',
      discount_amount: '',
      max_discount: '',
      min_order_amount: '',
      start_date: '',
      expiry_date: '',
      usage_limit: '',
      once_per_user: true,
      is_active: true
    });
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = (voucher) => {
    setEditingVoucher(voucher);
    setFormData({
      code: voucher.code,
      discount_type: voucher.discount_type,
      discount_amount: voucher.discount_amount,
      max_discount: voucher.max_discount || '',
      min_order_amount: voucher.min_order_amount || '',
      start_date: voucher.start_date ? voucher.start_date.split('T')[0] : '',
      expiry_date: voucher.expiry_date ? voucher.expiry_date.split('T')[0] : '',
      usage_limit: voucher.usage_limit || '',
      once_per_user: voucher.once_per_user !== false,
      is_active: voucher.is_active
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const token = getToken();
      const url = editingVoucher
        ? `${API_URL}/api/admin/vouchers/${editingVoucher.id}`
        : `${API_URL}/api/admin/vouchers`;

      const method = editingVoucher ? 'PUT' : 'POST';

      const isFreeShipping = formData.discount_type === 'free_shipping';
      const payload = {
        code: formData.code,
        discount_type: formData.discount_type,
        discount_amount: isFreeShipping ? 0 : parseFloat(formData.discount_amount),
        max_discount: isFreeShipping ? null : (formData.max_discount ? parseFloat(formData.max_discount) : null),
        min_order_amount: formData.min_order_amount ? parseFloat(formData.min_order_amount) : null,
        start_date: formData.start_date || null,
        expiry_date: formData.expiry_date || null,
        usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null,
        once_per_user: formData.once_per_user,
        is_active: formData.is_active
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save voucher');
      }

      setShowModal(false);
      fetchVouchers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (voucher) => {
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/vouchers/${voucher.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to toggle voucher status');

      fetchVouchers();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteVoucher = async (voucher) => {
    if (!window.confirm(`Are you sure you want to delete voucher "${voucher.code}"?`)) {
      return;
    }

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/vouchers/${voucher.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to delete voucher');

      fetchVouchers();
    } catch (err) {
      setError(err.message);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (voucher) => {
    const now = new Date();
    const startDate = voucher.start_date ? new Date(voucher.start_date) : null;
    const expiryDate = voucher.expiry_date ? new Date(voucher.expiry_date) : null;

    if (!voucher.is_active) {
      return <span className="status-badge status-inactive">Inactive</span>;
    }

    if (startDate && startDate > now) {
      return <span className="status-badge status-scheduled">Scheduled</span>;
    }

    if (expiryDate && expiryDate < now) {
      return <span className="status-badge status-expired">Expired</span>;
    }

    if (voucher.usage_limit && voucher.times_used >= voucher.usage_limit) {
      return <span className="status-badge status-exhausted">Exhausted</span>;
    }

    return <span className="status-badge status-active">Active</span>;
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading vouchers...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Vouchers</h1>
        <button className="btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Create Voucher
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="admin-card">
        {vouchers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#1e293b' }}>
            <p>No vouchers created yet.</p>
            <p>Click "Create Voucher" to add your first discount code.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Discount</th>
                  <th>Min. Order</th>
                  <th>Start Date</th>
                  <th>Expiry Date</th>
                  <th>Usage</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher) => (
                  <tr key={voucher.id}>
                    <td>
                      <strong style={{ fontFamily: 'monospace', fontSize: '14px' }}>{voucher.code}</strong>
                    </td>
                    <td>
                      {voucher.discount_type === 'free_shipping'
                        ? 'Free Shipping'
                        : voucher.discount_type === 'fixed'
                          ? `RM ${parseFloat(voucher.discount_amount).toFixed(2)}`
                          : `${voucher.discount_amount}%`}
                      {voucher.discount_type === 'percentage' && voucher.max_discount && (
                        <span style={{ fontSize: '12px', color: '#475569', display: 'block' }}>
                          Max: RM {parseFloat(voucher.max_discount).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td>
                      {voucher.min_order_amount
                        ? `RM ${parseFloat(voucher.min_order_amount).toFixed(2)}`
                        : '-'}
                    </td>
                    <td>{formatDate(voucher.start_date)}</td>
                    <td>{formatDate(voucher.expiry_date)}</td>
                    <td>
                      {voucher.times_used}
                      {voucher.usage_limit && ` / ${voucher.usage_limit}`}
                    </td>
                    <td>{getStatusBadge(voucher)}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(voucher)}
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => toggleStatus(voucher)}
                          title={voucher.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {voucher.is_active ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 0110 0v4" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                              <path d="M7 11V7a5 5 0 019.9-1" />
                            </svg>
                          )}
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => deleteVoucher(voucher)}
                          title="Delete"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingVoucher ? 'Edit Voucher' : 'Create Voucher'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && <div className="alert alert-error">{formError}</div>}

              <div className="form-group">
                <label htmlFor="code">Voucher Code *</label>
                <input
                  type="text"
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., WELCOME10"
                  required
                  style={{ textTransform: 'uppercase', fontFamily: 'monospace' }}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="discount_type">Discount Type *</label>
                  <select
                    id="discount_type"
                    value={formData.discount_type}
                    onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                    required
                  >
                    <option value="fixed">Fixed Amount (RM)</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="free_shipping">Free Shipping</option>
                  </select>
                </div>

                {formData.discount_type !== 'free_shipping' && (
                <div className="form-group">
                  <label htmlFor="discount_amount">
                    Discount Amount *
                    {formData.discount_type === 'fixed' ? ' (RM)' : ' (%)'}
                  </label>
                  <input
                    type="number"
                    id="discount_amount"
                    value={formData.discount_amount}
                    onChange={(e) => setFormData({ ...formData, discount_amount: e.target.value })}
                    placeholder={formData.discount_type === 'fixed' ? '10.00' : '10'}
                    min="0.01"
                    max={formData.discount_type === 'percentage' ? '100' : undefined}
                    step="0.01"
                    required
                  />
                </div>
                )}
              </div>

              {formData.discount_type === 'percentage' && (
                <div className="form-group">
                  <label htmlFor="max_discount">Maximum Discount (RM) - Optional</label>
                  <input
                    type="number"
                    id="max_discount"
                    value={formData.max_discount}
                    onChange={(e) => setFormData({ ...formData, max_discount: e.target.value })}
                    placeholder="e.g., 50.00"
                    min="0"
                    step="0.01"
                  />
                  <small style={{ color: 'var(--admin-text)' }}>
                    Cap the maximum discount amount for percentage vouchers
                  </small>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="min_order_amount">Minimum Order Amount (RM) - Optional</label>
                <input
                  type="number"
                  id="min_order_amount"
                  value={formData.min_order_amount}
                  onChange={(e) => setFormData({ ...formData, min_order_amount: e.target.value })}
                  placeholder="e.g., 50.00"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="start_date">Start Date - Optional</label>
                  <input
                    type="date"
                    id="start_date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="expiry_date">Expiry Date - Optional</label>
                  <input
                    type="date"
                    id="expiry_date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="usage_limit">Total Usage Limit - Optional</label>
                <input
                  type="number"
                  id="usage_limit"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
                <small style={{ color: 'var(--admin-text)' }}>
                  Maximum total uses across all customers
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.once_per_user}
                    onChange={(e) => setFormData({ ...formData, once_per_user: e.target.checked })}
                  />
                  Once per user
                </label>
                <small style={{ color: 'var(--admin-text)', display: 'block', marginTop: '4px' }}>
                  When enabled, each customer can only use this voucher once
                </small>
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                  Active
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingVoucher ? 'Update Voucher' : 'Create Voucher')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--admin-primary);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-primary:hover {
          background: var(--admin-primary-hover);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: #ffffff;
          color: #1e293b;
          border: 1px solid var(--admin-border);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-icon {
          background: transparent;
          border: 1px solid var(--admin-border);
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          color: #475569;
        }

        .btn-icon:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .btn-icon.btn-danger:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #dc2626;
        }

        .table-container {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
        }

        .admin-table th,
        .admin-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
        }

        .admin-table th {
          font-weight: 600;
          color: #1e293b;
          font-size: 12px;
          text-transform: uppercase;
          background: #ffffff;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-inactive {
          background: #f3f4f6;
          color: #6b7280;
        }

        .status-expired {
          background: #fee2e2;
          color: #dc2626;
        }

        .status-exhausted {
          background: #fef3c7;
          color: #d97706;
        }

        .status-scheduled {
          background: #dbeafe;
          color: #2563eb;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #ffffff;
          color: #1e293b;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #1e293b;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          font-size: 14px;
          background: #ffffff;
          color: #1e293b;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--admin-primary);
        }

        .form-group small {
          display: block;
          margin-top: 4px;
          font-size: 12px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: auto;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--admin-border);
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .alert-error {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }
      `}</style>
    </div>
  );
};

export default AdminVouchers;
