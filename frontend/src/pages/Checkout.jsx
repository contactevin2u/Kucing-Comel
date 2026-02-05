import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/**
 * ============================================================
 * CHECKOUT PAGE - Single page with shipping & payment
 * ============================================================
 */

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { cart, clearCart, getCartItemsForOrder } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMode, setPaymentMode] = useState(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [policyAgreed, setPolicyAgreed] = useState(false);

  // Voucher state
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherApplied, setVoucherApplied] = useState(null);
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherLoading, setVoucherLoading] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  const [shippingData, setShippingData] = useState({
    shipping_name: user?.name || '',
    shipping_phone: user?.phone || '',
    shipping_address: user?.address || ''
  });

  // Fetch SenangPay config to check mode
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const config = await api.getSenangPayConfig();
        setPaymentMode(config.mode);
      } catch (err) {
        console.error('Failed to fetch payment config:', err);
      }
    };
    fetchConfig();
  }, []);

  // Calculate subtotal
  const subtotal = cart.items.reduce(
    (sum, item) => sum + parseFloat(item.price) * item.quantity,
    0
  );

  // Handle voucher application
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      setVoucherError('Please enter a voucher code');
      return;
    }

    const userEmail = isAuthenticated ? user?.email : guestEmail;

    setVoucherLoading(true);
    setVoucherError('');

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/vouchers/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: voucherCode.trim(), subtotal, email: userEmail })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid voucher code');
      }

      setVoucherApplied(data.voucher);
      setVoucherDiscount(data.calculated_discount);
      setVoucherError('');
    } catch (err) {
      setVoucherError(err.message);
      setVoucherApplied(null);
      setVoucherDiscount(0);
    } finally {
      setVoucherLoading(false);
    }
  };

  const handleRemoveVoucher = () => {
    setVoucherCode('');
    setVoucherApplied(null);
    setVoucherDiscount(0);
    setVoucherError('');
  };

  // Handle payment status from URL params (SenangPay return)
  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    const errorParam = searchParams.get('error');
    const msg = searchParams.get('msg');

    if (paymentStatus === 'failed') {
      setError(`Payment failed: ${msg || 'Please try again'}`);
    } else if (errorParam) {
      setError(`Payment error: ${errorParam}`);
    }
  }, [searchParams]);

  // Redirect if cart is empty
  useEffect(() => {
    if (cart.items.length === 0) {
      navigate('/cart');
    }
  }, [cart.items.length, navigate]);

  const handlePayment = async (e) => {
    e.preventDefault();

    // Validate shipping info
    if (!shippingData.shipping_name || !shippingData.shipping_phone || !shippingData.shipping_address) {
      setError('Please fill in all shipping details');
      return;
    }

    // Guest checkout requires email
    if (!isAuthenticated && !guestEmail) {
      setError('Please enter your email address');
      return;
    }

    // Validate email format for guests
    if (!isAuthenticated) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(guestEmail)) {
        setError('Please enter a valid email address');
        return;
      }
    }

    // Policy must be agreed
    if (!policyAgreed) {
      setError('Please agree to the terms and policies before proceeding');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let orderData;

      if (isAuthenticated) {
        // Authenticated user - use regular order endpoint
        const orderPayload = {
          ...shippingData,
          voucher_code: voucherApplied?.code || null
        };
        orderData = await api.createOrder(orderPayload);
      } else {
        // Guest checkout - use guest order endpoint
        const payload = {
          ...shippingData,
          guest_email: guestEmail,
          items: getCartItemsForOrder(),
          voucher_code: voucherApplied?.code || null
        };
        orderData = await api.createGuestOrder(payload);
      }

      const order = orderData.order;

      // Store guest email in sessionStorage for payment page
      if (!isAuthenticated && guestEmail) {
        sessionStorage.setItem('guestEmail', guestEmail);
      }

      // Initiate SenangPay payment
      const response = await api.initiateSenangPayPayment(order.id, !isAuthenticated ? guestEmail : null);

      if (response.success) {
        // MOCK MODE: Navigate to local mock payment page
        if (response.mode === 'mock') {
          sessionStorage.setItem('mockPaymentData', JSON.stringify(response.params));
          navigate('/mock-payment');
          return;
        }

        // REAL MODE: Submit form to SenangPay
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = response.payment_url;

        Object.entries(response.params).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value;
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
      } else {
        setError('Failed to initiate payment');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to process checkout');
      setLoading(false);
    }
  };

  // Order Summary Component (reusable)
  const OrderSummary = ({ className }) => (
    <div className={`cart-summary ${className || ''}`}>
      <h3>Order Summary</h3>

      {cart.items.map((item) => (
        <div key={item.id} style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: '10px 0',
          borderBottom: '1px solid #F7F9FC'
        }}>
          <span>
            {item.name} x {item.quantity}
          </span>
          <span>
            RM {(item.price * item.quantity).toFixed(2)}
          </span>
        </div>
      ))}

      {/* Voucher Input */}
      <div style={{ marginTop: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '8px' }}>
        <label style={{ fontWeight: '500', marginBottom: '8px', display: 'block', fontSize: '0.9rem' }}>
          Voucher Code
        </label>
        {voucherApplied ? (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#e8f5e9',
            padding: '10px 12px',
            borderRadius: '6px',
            border: '1px solid #4CAF50'
          }}>
            <div>
              <span style={{ fontWeight: '600', color: '#2e7d32', fontFamily: 'monospace' }}>
                {voucherApplied.code}
              </span>
              <span style={{ marginLeft: '10px', color: '#4CAF50', fontSize: '0.85rem' }}>
                -RM {voucherDiscount.toFixed(2)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveVoucher}
              style={{
                background: 'none',
                border: 'none',
                color: '#d32f2f',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              &times;
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              style={{
                flex: 1,
                padding: '10px 12px',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontFamily: 'monospace',
                textTransform: 'uppercase'
              }}
            />
            <button
              type="button"
              onClick={handleApplyVoucher}
              disabled={voucherLoading}
              style={{
                padding: '10px 16px',
                background: '#FF6B6B',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: voucherLoading ? 'not-allowed' : 'pointer',
                fontWeight: '500'
              }}
            >
              {voucherLoading ? '...' : 'Apply'}
            </button>
          </div>
        )}
        {voucherError && (
          <p style={{ color: '#d32f2f', fontSize: '0.8rem', marginTop: '8px', marginBottom: 0 }}>
            {voucherError}
          </p>
        )}
      </div>

      <div className="summary-row" style={{ marginTop: '15px' }}>
        <span>Subtotal</span>
        <span>RM {subtotal.toFixed(2)}</span>
      </div>

      {voucherDiscount > 0 && (
        <div className="summary-row" style={{ color: '#4CAF50' }}>
          <span>Discount {voucherApplied?.code ? `(${voucherApplied.code})` : ''}</span>
          <span>-RM {voucherDiscount.toFixed(2)}</span>
        </div>
      )}

      <div className="summary-row">
        <span>Shipping</span>
        <span style={{ color: '#27AE60' }}>FREE</span>
      </div>

      <div className="summary-row summary-total">
        <span>Total</span>
        <span>RM {(subtotal - voucherDiscount).toFixed(2)}</span>
      </div>
    </div>
  );

  return (
    <div className="checkout-page">
      <style>{`
        .checkout-layout {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 30px;
          align-items: start;
        }

        .checkout-main {
          display: flex;
          flex-direction: column;
        }

        .order-summary-desktop {
          position: sticky;
          top: 20px;
        }

        .order-summary-mobile {
          display: none;
          position: static !important;
        }

        @media (max-width: 768px) {
          .checkout-layout {
            grid-template-columns: 1fr;
          }

          .order-summary-desktop {
            display: none;
          }

          .order-summary-mobile {
            display: block;
            position: static !important;
            margin-top: 20px;
            margin-bottom: 20px;
          }
        }
      `}</style>

      <div className="container">
        <h1 style={{ marginBottom: '30px' }}>Checkout</h1>

        {/* Guest Checkout Notice */}
        {!isAuthenticated && (
          <div style={{
            background: '#e3f2fd',
            border: '1px solid #2196F3',
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>&#128100;</span>
            <span style={{ fontSize: '0.9rem', color: '#1565C0' }}>
              Checking out as guest. <a href="/login" style={{ color: '#1565C0', fontWeight: '600' }}>Login</a> to track your orders.
            </span>
          </div>
        )}

        {/* Mock Mode Banner */}
        {paymentMode === 'mock' && (
          <div style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '8px',
            padding: '12px 20px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '1.2rem' }}>&#9888;</span>
            <span style={{ fontSize: '0.9rem', color: '#856404' }}>
              <strong>Development Mode:</strong> Payments are simulated.
            </span>
          </div>
        )}

        <div className="checkout-layout">
          <div className="checkout-main">
            <form onSubmit={handlePayment}>
              {/* Shipping Section */}
              <div className="form-section">
                <h3>Contact & Shipping Information</h3>

                {/* Email field */}
                <div className="form-group">
                  <label>Email Address *</label>
                  {isAuthenticated ? (
                    <input
                      type="email"
                      value={user?.email || ''}
                      readOnly
                      style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
                    />
                  ) : (
                    <input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                    />
                  )}
                  <small style={{ color: '#666', fontSize: '0.8rem' }}>
                    Order confirmation will be sent to this email
                  </small>
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    value={shippingData.shipping_name}
                    onChange={(e) => setShippingData({ ...shippingData, shipping_name: e.target.value })}
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    value={shippingData.shipping_phone}
                    onChange={(e) => setShippingData({ ...shippingData, shipping_phone: e.target.value })}
                    placeholder="e.g., +60 12-345-6789"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Shipping Address *</label>
                  <textarea
                    value={shippingData.shipping_address}
                    onChange={(e) => setShippingData({ ...shippingData, shipping_address: e.target.value })}
                    placeholder="Enter your full address"
                    rows="4"
                    required
                  />
                </div>
              </div>

              {/* Order Summary - Mobile Only (between shipping and payment) */}
              <OrderSummary className="order-summary-mobile" />

              {/* Payment Section */}
              <div className="form-section" style={{ marginTop: '30px' }}>
                <h3>Payment</h3>

                {/* SenangPay Info */}
                <div style={{
                  padding: '15px 20px',
                  border: '2px solid #4CAF50',
                  borderRadius: '8px',
                  marginBottom: '25px',
                  background: '#f0fff0'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                    <strong>SenangPay</strong>
                    {paymentMode === 'mock' && (
                      <span style={{
                        fontSize: '0.75rem',
                        background: '#ffc107',
                        color: '#333',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}>MOCK</span>
                    )}
                  </div>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#666' }}>
                    Available payment methods:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {[
                      'FPX (Online Banking)',
                      'Visa',
                      'Mastercard',
                      'GrabPay',
                      'Touch \'n Go eWallet',
                      'Boost',
                      'ShopeePay',
                      'MAE',
                      'DuitNow QR',
                      'Atome',
                      'ShopBack PayLater'
                    ].map((method) => (
                      <span key={method} style={{
                        fontSize: '0.75rem',
                        background: '#e8f5e9',
                        color: '#2e7d32',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        border: '1px solid #c8e6c9'
                      }}>{method}</span>
                    ))}
                  </div>
                </div>

                {/* Policy Links */}
                <div style={{
                  padding: '15px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.85rem'
                }}>
                  <p style={{ margin: '0 0 10px 0', fontWeight: '500' }}>
                    Please review our policies:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    <a
                      href="http://app.senangpay.my/policy/5501769075421851"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline' }}
                    >
                      TERMS & CONDITIONS
                    </a>
                    <span style={{ color: '#ccc' }}>|</span>
                    <a
                      href="http://app.senangpay.my/policy/5501769075421852"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline' }}
                    >
                      PRIVACY POLICY
                    </a>
                    <span style={{ color: '#ccc' }}>|</span>
                    <a
                      href="http://app.senangpay.my/policy/5501769075421854"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline' }}
                    >
                      CANCELLATION, AND REFUND POLICY
                    </a>
                    <span style={{ color: '#ccc' }}>|</span>
                    <a
                      href="http://app.senangpay.my/policy/5501769075421855"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline' }}
                    >
                      SHIPPING POLICY
                    </a>
                  </div>
                </div>

                {/* Policy Consent Checkbox */}
                <div style={{
                  padding: '15px',
                  border: policyAgreed ? '2px solid #4CAF50' : '2px solid #e0e0e0',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  background: policyAgreed ? '#f0fff0' : '#fff'
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}>
                    <input
                      type="checkbox"
                      checked={policyAgreed}
                      onChange={(e) => setPolicyAgreed(e.target.checked)}
                      style={{
                        width: '20px',
                        height: '20px',
                        marginTop: '2px',
                        cursor: 'pointer'
                      }}
                    />
                    <span>
                      I agree to the{' '}
                      <a
                        href="http://app.senangpay.my/policy/5501769075421851"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        TERMS & CONDITIONS
                      </a>
                      ,{' '}
                      <a
                        href="http://app.senangpay.my/policy/5501769075421852"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        PRIVACY POLICY
                      </a>
                      ,{' '}
                      <a
                        href="http://app.senangpay.my/policy/5501769075421854"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        CANCELLATION, AND REFUND POLICY
                      </a>
                      , and{' '}
                      <a
                        href="http://app.senangpay.my/policy/5501769075421855"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        SHIPPING POLICY
                      </a>
                    </span>
                  </label>
                </div>

                {error && <div className="alert alert-error" style={{ marginBottom: '15px' }}>{error}</div>}

                {/* Pay Button */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{
                    width: '100%',
                    background: policyAgreed ? '#4CAF50' : '#ccc',
                    cursor: policyAgreed && !loading ? 'pointer' : 'not-allowed'
                  }}
                  disabled={loading || !policyAgreed}
                >
                  {loading ? 'Processing...' : `Pay RM ${(subtotal - voucherDiscount).toFixed(2)} with SenangPay`}
                </button>

                <p style={{ marginTop: '20px', fontSize: '0.85rem', color: '#95A5A6', textAlign: 'center' }}>
                  Your payment is secure and encrypted
                </p>
              </div>
            </form>
          </div>

          {/* Order Summary - Desktop Only (sticky sidebar) */}
          <OrderSummary className="order-summary-desktop" />
        </div>
      </div>
    </div>
  );
};

export default Checkout;
