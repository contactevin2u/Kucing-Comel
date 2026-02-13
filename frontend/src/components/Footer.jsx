import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          {/* About Section */}
          <div className="footer-section">
            <div className="footer-logo">
              <img src="/lilien-logo-footer.png" alt="Lilien" className="footer-logo-img" /> <span style={{ alignSelf: 'flex-end', paddingBottom: '14px' }}>Lilien Official Store</span>
            </div>
            <p>
              Your one-stop shop for all pet products. We provide premium quality
              items for your beloved companions with love and care.
            </p>
          </div>

          {/* Contact */}
          <div className="footer-section" style={{ paddingTop: '45px' }}>
            <h4 style={{ paddingLeft: '24px' }}>Contact Us</h4>
            <a href="mailto:petpalshubsb@gmail.com" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Mail size={16} strokeWidth={1.5} /> petpalshubsb@gmail.com</a>
            <a href="tel:+6001128799638" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Phone size={16} strokeWidth={1.5} style={{ marginTop: '-4px', marginLeft: '-10px' }} /> 01128799638</a>
            <a href="https://maps.google.com/?q=1,+Jalan+Perusahaan+4,+Kawasan+Industri+Batu+Caves,+68100+Batu+Caves,+Selangor" target="_blank" rel="noopener noreferrer" className="footer-address-link" style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}><MapPin size={16} strokeWidth={1.5} className="footer-mappin" style={{ flexShrink: 0, marginTop: '3px' }} /><span>1, Jalan Perusahaan 4, Kawasan Industri Batu Caves, 68100 Batu Caves, Selangor</span></a>
          </div>

          {/* ============================================================
             Required for SenangPay approval - Policy links must be
             publicly visible in footer on all pages
             ============================================================ */}
          <div className="footer-section" style={{ paddingTop: '45px' }}>
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
          <p>© 2026 Lilien Official Store. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
