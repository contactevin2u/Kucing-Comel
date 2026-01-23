import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/**
 * ============================================================
 * CHECKOUT PAGE - Supports both logged-in users and guests
 * ============================================================
 */

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

const StripeCheckoutForm = ({ order, onSuccess, policyAgreed }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { clientSecret } = await api.createPaymentIntent(order.id);

      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        clientSecret,
        {
          payment_method: {
            card: elements.getElement(CardElement),
          },
        }
      );

      if (stripeError) {
        setError(stripeError.message);
      } else if (paymentIntent.status === 'succeeded') {
        onSuccess();
      }
    } catch (err) {
      setError(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Card Details</label>
        <div style={{
          padding: '15px',
          border: '2px solid #F7F9FC',
          borderRadius: '8px',
          background: '#fff'
        }}>
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#2C3E50',
                  '::placeholder': { color: '#95A5A6' },
                },
              },
            }}
          />
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary btn-lg"
        style={{
          width: '100%',
          background: policyAgreed ? '' : '#ccc',
          cursor: policyAgreed && !processing ? 'pointer' : 'not-allowed'
        }}
        disabled={!stripe || processing || !policyAgreed}
      >
        {processing ? 'Processing...' : `Pay RM ${order.total_amount}`}
      </button>
    </form>
  );
};

const SenangPayCheckoutForm = ({ order, guestEmail, onProcessing, policyAgreed }) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSenangPayPayment = async () => {
    setProcessing(true);
    setError(null);
    onProcessing(true);

    try {
      // Pass guest email if this is a guest order
      const response = await api.initiateSenangPayPayment(order.id, guestEmail);

      if (response.success) {
        // Store guest email in sessionStorage for mock payment page
        if (guestEmail) {
          sessionStorage.setItem('guestEmail', guestEmail);
        }

        // ============================================================
        // MOCK MODE: Navigate to local mock payment page
        // ============================================================
        if (response.mode === 'mock') {
          sessionStorage.setItem('mockPaymentData', JSON.stringify(response.params));
          navigate('/mock-payment');
          return;
        }

        // ============================================================
        // REAL MODE: Submit form to SenangPay
        // ============================================================
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
        onProcessing(false);
      }
    } catch (err) {
      setError(err.message || 'Failed to initiate SenangPay payment');
      setProcessing(false);
      onProcessing(false);
    }
  };

  return (
    <div>
      <div style={{
        padding: '20px',
        background: '#f8f9fa',
        borderRadius: '8px',
        marginBottom: '20px',
        textAlign: 'center'
      }}>
        <img
          src="https://app.senangpay.my/assets/logo/senangpay-logo.png"
          alt="SenangPay"
          style={{ height: '40px', marginBottom: '15px' }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>
          You will be redirected to complete your payment securely.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <button
        type="button"
        className="btn btn-primary btn-lg"
        style={{
          width: '100%',
          background: policyAgreed ? '#4CAF50' : '#ccc',
          cursor: policyAgreed && !processing ? 'pointer' : 'not-allowed'
        }}
        onClick={handleSenangPayPayment}
        disabled={processing || !policyAgreed}
      >
        {processing ? 'Redirecting...' : `Pay RM ${order.total_amount} with SenangPay`}
      </button>
    </div>
  );
};

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const { cart, clearCart, getCartItemsForOrder, isGuestCart } = useCart();

  const [step, setStep] = useState(1);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('senangpay');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [paymentMode, setPaymentMode] = useState(null);
  const [guestEmail, setGuestEmail] = useState('');
  const [policyAgreed, setPolicyAgreed] = useState(false);

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

  // Redirect if cart is empty (but allow if we have an order)
  useEffect(() => {
    if (cart.items.length === 0 && !order) {
      navigate('/cart');
    }
  }, [cart.items.length, order, navigate]);

  const handleShippingSubmit = async (e) => {
    e.preventDefault();

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

    setLoading(true);
    setError(null);

    try {
      let data;

      if (isAuthenticated) {
        // Authenticated user - use regular order endpoint
        data = await api.createOrder(shippingData);
      } else {
        // Guest checkout - use guest order endpoint
        const orderData = {
          ...shippingData,
          guest_email: guestEmail,
          items: getCartItemsForOrder()
        };
        data = await api.createGuestOrder(orderData);
      }

      setOrder(data.order);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    clearCart();
    if (isAuthenticated) {
      navigate('/orders', {
        state: { message: 'Payment successful! Thank you for your order.' }
      });
    } else {
      // Guest - redirect to order success page
      navigate(`/order-success?order_id=${order.id}`);
    }
  };

  return (
    <div className="checkout-page">
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

        {/* Progress Steps */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '30px',
          marginBottom: '40px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: step >= 1 ? '#FF6B6B' : '#95A5A6'
          }}>
            <span style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: step >= 1 ? '#FF6B6B' : '#F7F9FC',
              color: step >= 1 ? '#fff' : '#95A5A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600'
            }}>1</span>
            Shipping
          </div>
          <div style={{ color: '#95A5A6' }}>→</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: step >= 2 ? '#FF6B6B' : '#95A5A6'
          }}>
            <span style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: step >= 2 ? '#FF6B6B' : '#F7F9FC',
              color: step >= 2 ? '#fff' : '#95A5A6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600'
            }}>2</span>
            Payment
          </div>
        </div>

        <div className="checkout-grid">
          <div className="checkout-form">
            {step === 1 && (
              <form onSubmit={handleShippingSubmit}>
                <div className="form-section">
                  <h3>Contact & Shipping Information</h3>

                  {/* Email field for guests */}
                  {!isAuthenticated && (
                    <div className="form-group">
                      <label>Email Address *</label>
                      <input
                        type="email"
                        value={guestEmail}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="Enter your email"
                        required
                      />
                      <small style={{ color: '#666', fontSize: '0.8rem' }}>
                        Order confirmation will be sent to this email
                      </small>
                    </div>
                  )}

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

                {error && <div className="alert alert-error">{error}</div>}

                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%' }}
                  disabled={loading}
                >
                  {loading ? 'Creating Order...' : 'Continue to Payment'}
                </button>
              </form>
            )}

            {step === 2 && order && (
              <div className="form-section">
                <h3>Payment Method</h3>

                {/* Payment Method Selector */}
                <div style={{ marginBottom: '25px' }}>
                  <div
                    onClick={() => !isRedirecting && setPaymentMethod('senangpay')}
                    style={{
                      padding: '15px 20px',
                      border: paymentMethod === 'senangpay' ? '2px solid #4CAF50' : '2px solid #e0e0e0',
                      borderRadius: '8px',
                      marginBottom: '10px',
                      cursor: isRedirecting ? 'not-allowed' : 'pointer',
                      background: paymentMethod === 'senangpay' ? '#f0fff0' : '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '15px',
                      opacity: isRedirecting ? 0.6 : 1
                    }}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'senangpay'}
                      onChange={() => setPaymentMethod('senangpay')}
                      disabled={isRedirecting}
                    />
                    <div>
                      <strong>SenangPay</strong>
                      {paymentMode === 'mock' && (
                        <span style={{
                          marginLeft: '8px',
                          fontSize: '0.75rem',
                          background: '#ffc107',
                          color: '#333',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>MOCK</span>
                      )}
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                        FPX, Credit/Debit Card (Visa, Mastercard)
                      </p>
                    </div>
                  </div>

                  {/* Only show Stripe for authenticated users */}
                  {isAuthenticated && (
                    <div
                      onClick={() => !isRedirecting && setPaymentMethod('stripe')}
                      style={{
                        padding: '15px 20px',
                        border: paymentMethod === 'stripe' ? '2px solid #635BFF' : '2px solid #e0e0e0',
                        borderRadius: '8px',
                        cursor: isRedirecting ? 'not-allowed' : 'pointer',
                        background: paymentMethod === 'stripe' ? '#f0f0ff' : '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        opacity: isRedirecting ? 0.6 : 1
                      }}
                    >
                      <input
                        type="radio"
                        name="payment"
                        checked={paymentMethod === 'stripe'}
                        onChange={() => setPaymentMethod('stripe')}
                        disabled={isRedirecting}
                      />
                      <div>
                        <strong>Stripe</strong>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#666' }}>
                          Credit/Debit Card (International)
                        </p>
                      </div>
                    </div>
                  )}
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
                      Terms & Conditions
                    </a>
                    <span style={{ color: '#ccc' }}>|</span>
                    <a
                      href="http://app.senangpay.my/policy/5501769075421852"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline' }}
                    >
                      Cancellation Policy
                    </a>
                    <span style={{ color: '#ccc' }}>|</span>
                    <a
                      href="http://app.senangpay.my/policy/5501769075421854"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline' }}
                    >
                      Refund Policy
                    </a>
                    <span style={{ color: '#ccc' }}>|</span>
                    <a
                      href="http://app.senangpay.my/policy/5501769075421855"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#2196F3', textDecoration: 'underline' }}
                    >
                      Privacy Policy
                    </a>
                  </div>
                </div>

                {/* Policy Agreement Checkbox */}
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
                        Terms & Conditions
                      </a>
                      ,{' '}
                      <a
                        href="http://app.senangpay.my/policy/5501769075421852"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Cancellation
                      </a>
                      {' & '}
                      <a
                        href="http://app.senangpay.my/policy/5501769075421854"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Refund Policy
                      </a>
                      , and{' '}
                      <a
                        href="http://app.senangpay.my/policy/5501769075421855"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#2196F3' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        Privacy Policy
                      </a>
                    </span>
                  </label>
                </div>

                {/* Payment Form based on selected method */}
                {paymentMethod === 'stripe' && isAuthenticated ? (
                  <Elements stripe={stripePromise}>
                    <StripeCheckoutForm order={order} onSuccess={handlePaymentSuccess} policyAgreed={policyAgreed} />
                  </Elements>
                ) : (
                  <SenangPayCheckoutForm
                    order={order}
                    guestEmail={!isAuthenticated ? guestEmail : null}
                    onProcessing={setIsRedirecting}
                    policyAgreed={policyAgreed}
                  />
                )}

                {error && <div className="alert alert-error" style={{ marginTop: '15px' }}>{error}</div>}

                <p style={{ marginTop: '20px', fontSize: '0.85rem', color: '#95A5A6', textAlign: 'center' }}>
                  Your payment is secure and encrypted
                </p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          <div className="cart-summary">
            <h3>Order Summary</h3>

            {(order?.items || cart.items).map((item) => (
              <div key={item.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid #F7F9FC'
              }}>
                <span>
                  {item.product_name || item.name} x {item.quantity}
                </span>
                <span>
                  RM {((item.product_price || item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}

            <div className="summary-row" style={{ marginTop: '15px' }}>
              <span>Shipping</span>
              <span style={{ color: '#27AE60' }}>FREE</span>
            </div>

            <div className="summary-row summary-total">
              <span>Total</span>
              <span>RM {order?.total_amount || cart.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
