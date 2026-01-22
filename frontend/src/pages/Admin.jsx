import React from 'react';
import { useNavigate } from 'react-router-dom';

const Admin = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin/login');
  };

  return (
    <div className="cart-page">
      <div className="container">
        <div className="products-header">
          <h2>Admin Dashboard</h2>
          <button onClick={handleLogout} className="btn btn-secondary">
            Logout
          </button>
        </div>

        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '40px',
          textAlign: 'center',
          marginTop: '20px'
        }}>
          <h3>Welcome, Admin!</h3>
          <p style={{ color: '#636E72', marginTop: '10px' }}>
            Admin panel is ready. Add your admin features here.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Admin;
