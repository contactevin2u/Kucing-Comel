import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-section">
            <h4>🐱 Kucing Comel</h4>
            <p>
              Your one-stop shop for all cat products. We provide the best quality
              items for your beloved feline friends.
            </p>
          </div>
          <div className="footer-section">
            <h4>Quick Links</h4>
            <Link to="/">Shop</Link>
            <Link to="/cart">Cart</Link>
            <Link to="/orders">My Orders</Link>
          </div>
          <div className="footer-section">
            <h4>Categories</h4>
            <Link to="/?category=Food">Cat Food</Link>
            <Link to="/?category=Toys">Toys</Link>
            <Link to="/?category=Accessories">Accessories</Link>
            <Link to="/?category=Grooming">Grooming</Link>
          </div>
          <div className="footer-section">
            <h4>Contact</h4>
            <p>Email: hello@kucingcomel.com</p>
            <p>Phone: +60 12-345-6789</p>
            <p>Kuala Lumpur, Malaysia</p>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 Kucing Comel. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
