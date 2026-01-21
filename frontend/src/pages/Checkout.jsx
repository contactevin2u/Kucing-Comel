import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY || 'pk_test_placeholder');

const CheckoutForm = ({ order, onSuccess }) => {
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

const Checkout = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const { cart, refreshCart } = useCart();

  const [step, setStep] = useState(1);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [shippingData, setShippingData] = useState({
    shipping_name: user?.name || '',
    shipping_phone: user?.phone || '',
    shipping_address: user?.address || ''
  });

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
                <h3>Payment</h3>
                <Elements stripe={stripePromise}>
                  <CheckoutForm order={order} onSuccess={handlePaymentSuccess} />
                </Elements>

                <p style={{ marginTop: '20px', fontSize: '0.85rem', color: '#95A5A6', textAlign: 'center' }}>
                  🔒 Your payment is secure and encrypted
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
                  {item.product_name || item.name} × {item.quantity}
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
