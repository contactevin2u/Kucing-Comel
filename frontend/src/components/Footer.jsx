import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* About Section */}
          <div className="footer-section">
            <div className="footer-logo">
              <span>🐱</span> Kucing Comel
            </div>
            <p>
              Your one-stop shop for all cat products. We provide premium quality
              items for your beloved feline friends with love and care.
            </p>
          </div>

          {/* Quick Links */}
          <div className="footer-section">
            <h4>Quick Links</h4>
            <Link to="/">Home</Link>
            <Link to="/?category=Food">Cat Food</Link>
            <Link to="/?category=Toys">Toys</Link>
            <Link to="/cart">Shopping Cart</Link>
            <Link to="/orders">My Orders</Link>
          </div>

          {/* Categories */}
          <div className="footer-section">
            <h4>Categories</h4>
            <Link to="/?category=Food">Food</Link>
            <Link to="/?category=Toys">Toys</Link>
            <Link to="/?category=Beds">Beds</Link>
            <Link to="/?category=Grooming">Grooming</Link>
            <Link to="/?category=Accessories">Accessories</Link>
          </div>

          {/* Contact */}
          <div className="footer-section">
            <h4>Contact Us</h4>
            <p>📧 hello@kucingcomel.com</p>
            <p>📞 +60 12-345-6789</p>
            <p>📍 Kuala Lumpur, Malaysia</p>
            <div style={{ marginTop: '15px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.5rem', cursor: 'pointer' }}>📘</span>
              <span style={{ fontSize: '1.5rem', cursor: 'pointer' }}>📸</span>
              <span style={{ fontSize: '1.5rem', cursor: 'pointer' }}>🐦</span>
            </div>
          </div>

          {/* ============================================================
             Required for SenangPay approval - Policy links must be
             publicly visible in footer on all pages
             ============================================================ */}
          <div className="footer-section">
            <h4>Legal</h4>
            <a
              href="http://app.senangpay.my/policy/5501769075421851"
              target="_blank"
              rel="noopener noreferrer"
            >
              TERMS & CONDITIONS
            </a>
            <a
              href="http://app.senangpay.my/policy/5501769075421852"
              target="_blank"
              rel="noopener noreferrer"
            >
              PRIVACY POLICY
            </a>
            <a
              href="http://app.senangpay.my/policy/5501769075421854"
              target="_blank"
              rel="noopener noreferrer"
            >
              CANCELLATION, AND REFUND POLICY
            </a>
            <a
              href="http://app.senangpay.my/policy/5501769075421855"
              target="_blank"
              rel="noopener noreferrer"
            >
              SHIPPING POLICY
            </a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2024 Kucing Comel. All rights reserved. Made with ❤️ for cats</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
