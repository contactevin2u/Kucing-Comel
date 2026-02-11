import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* About Section */}
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/lilien-logo-footer.png" alt="Lilien" className="footer-logo-img" /> Lilien Official Store
            </div>
            <p>
              Your one-stop shop for all cat products. We provide premium quality
              items for your beloved feline friends with love and care.
            </p>
          </div>

          {/* Contact */}
          <div className="footer-section">
            <h4>Contact Us</h4>
            <p>📧 hello@kucingcomel.com</p>
            <p>📞 +60 12-345-6789</p>
            <p>📍 Kuala Lumpur, Malaysia</p>
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
          <p>© 2024 Lilien Official Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
