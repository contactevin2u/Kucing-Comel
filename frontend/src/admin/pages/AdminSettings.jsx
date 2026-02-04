import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminSettings = () => {
  const { getToken, admin } = useAdminAuth();
  const [feeConfig, setFeeConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFeeConfig();
  }, []);

  const fetchFeeConfig = async () => {
    try {
      setLoading(true);
      const token = getToken();

      const response = await fetch(`${API_URL}/api/admin/config/fees`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch fee configuration');

      const data = await response.json();
      setFeeConfig(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Settings</h1>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      <div className="settings-grid">
        {/* Admin Info */}
        <div className="admin-card settings-section">
          <h3>Admin Account</h3>
          <div className="order-info-grid">
            <div className="order-info-item">
              <span className="order-info-label">Name</span>
              <span className="order-info-value">{admin?.name}</span>
            </div>
            <div className="order-info-item">
              <span className="order-info-label">Email</span>
              <span className="order-info-value">{admin?.email}</span>
            </div>
            <div className="order-info-item">
              <span className="order-info-label">Role</span>
              <span className="order-info-value" style={{ textTransform: 'capitalize' }}>{admin?.role}</span>
            </div>
          </div>
        </div>

        {/* SenangPay Fee Configuration */}
        <div className="admin-card settings-section">
          <h3>SenangPay Fee Structure</h3>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            These are the official SenangPay fees for Malaysia. Fees are automatically calculated for each order.
            To update these rates, edit <code>backend/src/config/fees.js</code>.
          </p>

          {feeConfig && (
            <table className="fee-table">
              <thead>
                <tr>
                  <th>Payment Method</th>
                  <th>Fee Percentage</th>
                  <th>Minimum Fee</th>
                  <th>Applied Rate</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(feeConfig.senangPayFees).map(([key, config]) => (
                  <tr key={key}>
                    <td>
                      <strong>{config.name}</strong>
                      <br />
                      <span style={{ fontSize: '12px', color: 'var(--admin-text-muted)' }}>
                        Code: {key}
                      </span>
                    </td>
                    <td>{(config.percentage * 100).toFixed(1)}%</td>
                    <td>RM {config.minimum.toFixed(2)}</td>
                    <td style={{ fontSize: '13px', color: 'var(--admin-text-muted)' }}>
                      Whichever is higher
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Default Delivery Fee */}
        <div className="admin-card settings-section">
          <h3>Delivery Fee</h3>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Default delivery fee applied to all orders. Can be modified per order in the order details page.
          </p>

          <div style={{
            background: 'var(--admin-bg)',
            padding: '20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: 'var(--admin-text-muted)', marginBottom: '4px' }}>
                Default Delivery Fee
              </div>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>
                RM {feeConfig?.defaultDeliveryFee?.toFixed(2)}
              </div>
            </div>
            <div style={{ fontSize: '13px', color: 'var(--admin-text-muted)', textAlign: 'right' }}>
              To change, edit<br />
              <code>backend/src/config/fees.js</code>
            </div>
          </div>
        </div>

        {/* Net Earnings Formula */}
        <div className="admin-card settings-section">
          <h3>Net Earnings Calculation</h3>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Net earnings are calculated automatically for every order using this formula:
          </p>

          <div style={{
            background: '#1e293b',
            color: '#e2e8f0',
            padding: '20px',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '14px',
            lineHeight: '1.8'
          }}>
            <div style={{ color: '#94a3b8' }}>// Net Earnings Formula</div>
            <div><span style={{ color: '#7dd3fc' }}>Net Earnings</span> = Order Total</div>
            <div style={{ paddingLeft: '60px' }}>- SenangPay Fee</div>
            <div style={{ paddingLeft: '60px' }}>- Other Fees (if any)</div>
            <br />
            <div style={{ color: '#94a3b8' }}>// Where Order Total includes:</div>
            <div><span style={{ color: '#7dd3fc' }}>Order Total</span> = Product Total + Delivery Fee</div>
            <br />
            <div style={{ color: '#94a3b8' }}>// SenangPay Fee Calculation:</div>
            <div><span style={{ color: '#7dd3fc' }}>Fee</span> = MAX(Order Total × Rate%, Minimum Fee)</div>
          </div>
        </div>

        {/* API Information */}
        <div className="admin-card settings-section">
          <h3>API Endpoints</h3>
          <p style={{ color: 'var(--admin-text-muted)', fontSize: '14px', marginBottom: '20px' }}>
            Admin API endpoints for integration:
          </p>

          <div style={{ fontSize: '13px' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '100px 1fr',
              gap: '8px 16px',
              background: 'var(--admin-bg)',
              padding: '16px',
              borderRadius: '8px'
            }}>
              <strong>GET</strong>
              <code>/api/admin/dashboard</code>

              <strong>GET</strong>
              <code>/api/admin/orders</code>

              <strong>GET</strong>
              <code>/api/admin/orders/:id</code>

              <strong>PATCH</strong>
              <code>/api/admin/orders/:id/status</code>

              <strong>GET</strong>
              <code>/api/admin/orders/export</code>

              <strong>GET</strong>
              <code>/api/admin/customers</code>

              <strong>GET</strong>
              <code>/api/admin/stats/daily</code>

              <strong>GET</strong>
              <code>/api/admin/stats/monthly</code>

              <strong>GET</strong>
              <code>/api/admin/config/fees</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
