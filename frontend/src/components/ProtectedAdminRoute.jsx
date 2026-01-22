import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { api } from '../services/api';

const ProtectedAdminRoute = ({ children }) => {
  const [isVerified, setIsVerified] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyToken = async () => {
      const adminToken = localStorage.getItem('adminToken');

      if (!adminToken) {
        setLoading(false);
        return;
      }

      try {
        await api.verifyAdmin();
        setIsVerified(true);
      } catch (error) {
        localStorage.removeItem('adminToken');
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!isVerified) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

export default ProtectedAdminRoute;
