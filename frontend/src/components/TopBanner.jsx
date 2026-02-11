import React, { useState, useEffect } from 'react';
import { PartyPopper, Sparkles } from 'lucide-react';

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
      background: isLoggedIn ? '#8CD4B4' : '#E891A8',
      color: 'white',
      textAlign: 'center',
      padding: '10px 16px',
      fontSize: '14px',
      fontWeight: '500'
    }}>
      {isLoggedIn
        ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>You're enjoying member prices <PartyPopper size={16} strokeWidth={1.5} /></span>
        : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>Login to unlock member-only discounts <Sparkles size={16} strokeWidth={1.5} /></span>}
    </div>
  );
};

export default TopBanner;
