import React, { useState, useEffect } from 'react';

const TopBanner = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    // Check login status
    const checkAuth = () => {
      setIsLoggedIn(!!localStorage.getItem('token'));
    };

    // Listen for storage changes (cross-tab)
    window.addEventListener('storage', checkAuth);

    // Listen for custom auth events (same tab)
    window.addEventListener('authChange', checkAuth);

    return () => {
      window.removeEventListener('storage', checkAuth);
      window.removeEventListener('authChange', checkAuth);
    };
  }, []);

  return (
    <div style={{
      background: isLoggedIn ? '#10B981' : '#FF6B6B',
      color: 'white',
      textAlign: 'center',
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500'
    }}>
      {isLoggedIn
        ? "You're enjoying member prices 🎉"
        : "Login to unlock member-only discounts ✨"}
    </div>
  );
};

export default TopBanner;
