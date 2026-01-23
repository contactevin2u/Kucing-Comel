import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/**
 * ============================================================
 * CHECKOUT PAGE
 * ============================================================
 * Supports both Stripe and SenangPay payment methods.
 *
 * SENANGPAY MODES:
 * - "mock"      : Uses local mock payment page (for development)
 * - "senangpay" : Redirects to real SenangPay (after approval)
 *
 * TO SWITCH TO REAL SENANGPAY:
 * 1. Set PAYMENT_MODE=senangpay in backend .env
 * 2. Add real SENANGPAY_MERCHANT_ID and SENANGPAY_SECRET_KEY
 * ============================================================
 */

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

const StripeCheckoutForm = ({ order, onSuccess }) => {
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
        style={{ width: '100%' }}
        disabled={!stripe || processing}
      >
        {processing ? 'Processing...' : `Pay RM ${order.total_amount}`}
      </button>
    </form>
  );
};

const SenangPayCheckoutForm = ({ order, onProcessing }) => {
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSenangPayPayment = async () => {
    setProcessing(true);
    setError(null);
    onProcessing(true);

    try {
      const response = await api.initiateSenangPayPayment(order.id);

      if (response.success) {
        // ============================================================
        // MOCK MODE: Navigate to local mock payment page
        // ============================================================
        if (response.mode === 'mock') {
          // Store payment data in sessionStorage for mock payment page
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

        // Add all params as hidden fields
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
        style={{ width: '100%', background: '#4CAF50' }}
        onClick={handleSenangPayPayment}
        disabled={processing}
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
  const { cart, refreshCart } = useCart();

  const [step, setStep] = useState(1);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('senangpay');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [paymentMode, setPaymentMode] = useState(null);

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

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    } else if (cart.items.length === 0 && !order) {
      navigate('/cart');
    }
  }, [isAuthenticated, cart.items.length, order, navigate]);

  const handleShippingSubmit = async (e) => {
    e.preventDefault();

    if (!shippingData.shipping_name || !shippingData.shipping_phone || !shippingData.shipping_address) {
      setError('Please fill in all shipping details');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await api.createOrder(shippingData);
      setOrder(data.order);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    refreshCart();
    navigate('/orders', {
      state: { message: 'Payment successful! Thank you for your order.' }
    });
  };

  if (!isAuthenticated) return null;

  return (
    <div className="checkout-page">
      <div className="container">
        <h1 style={{ marginBottom: '30px' }}>Checkout</h1>

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
              <strong>Development Mode:</strong> SenangPay integration pending approval. Payments are simulated.
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
                  <h3>Shipping Information</h3>

                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={shippingData.shipping_name}
                      onChange={(e) => setShippingData({ ...shippingData, shipping_name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={shippingData.shipping_phone}
                      onChange={(e) => setShippingData({ ...shippingData, shipping_phone: e.target.value })}
                      placeholder="e.g., +60 12-345-6789"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Shipping Address</label>
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
                </div>

                {/* Payment Form based on selected method */}
                {paymentMethod === 'stripe' ? (
                  <Elements stripe={stripePromise}>
                    <StripeCheckoutForm order={order} onSuccess={handlePaymentSuccess} />
                  </Elements>
                ) : (
                  <SenangPayCheckoutForm order={order} onProcessing={setIsRedirecting} />
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
