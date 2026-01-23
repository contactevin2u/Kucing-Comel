import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

/**
 * ============================================================
 * MOCK PAYMENT PAGE
 * ============================================================
 * This page simulates the SenangPay payment experience for development.
 * Supports both authenticated users and guest checkout.
 *
 * TO SWITCH TO REAL SENANGPAY:
 * 1. Set PAYMENT_MODE=senangpay in backend .env
 * 2. Add real SENANGPAY_MERCHANT_ID and SENANGPAY_SECRET_KEY
 * 3. This page will no longer be used - users will be redirected to SenangPay
 * ============================================================
 */

const MockPayment = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { clearCart } = useCart();

  const [processing, setProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState(null);

  // Get payment data from sessionStorage
  useEffect(() => {
    const storedData = sessionStorage.getItem('mockPaymentData');
    if (storedData) {
      setPaymentData(JSON.parse(storedData));
    } else {
      // No payment data, redirect back to cart
      navigate('/cart');
    }
  }, [navigate]);

  const handlePayment = async (action) => {
    if (!paymentData) return;

    setProcessing(true);

    try {
      const response = await api.processMockPayment(paymentData.order_id, action);

      // Clear stored payment data
      sessionStorage.removeItem('mockPaymentData');

      if (response.success) {
        // Payment successful - clear cart
        clearCart();

        // Redirect based on user type
        if (response.is_guest || !isAuthenticated) {
          // Guest order - extract order ID and redirect to success page
          const orderId = paymentData.order_id.split('-')[1];
          navigate(`/order-success?order_id=${orderId}`);
        } else {
          // Authenticated user - redirect to orders page
          navigate('/orders', {
            state: { message: 'Payment successful! Thank you for your order. (MOCK)' }
          });
        }
      } else {
        // Payment failed - redirect back to checkout
        navigate('/checkout?payment=failed&msg=' + encodeURIComponent(response.msg));
      }
    } catch (error) {
      console.error('Mock payment error:', error);
      navigate('/checkout?payment=failed&msg=' + encodeURIComponent(error.message));
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = () => {
    sessionStorage.removeItem('mockPaymentData');
    navigate('/checkout');
  };

  if (!paymentData) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '50px 20px' }}>
        <p>Loading payment details...</p>
      </div>
    );
  }

  const amountRM = (paymentData.amount / 100).toFixed(2);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxWidth: '500px',
        width: '100%',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: '#4CAF50',
          color: '#fff',
          padding: '25px',
          textAlign: 'center'
        }}>
          <div style={{
            background: '#fff',
            color: '#4CAF50',
            display: 'inline-block',
            padding: '8px 16px',
            borderRadius: '20px',
            fontSize: '0.8rem',
            fontWeight: '600',
            marginBottom: '15px'
          }}>
            MOCK PAYMENT - Development Mode
          </div>
          <h2 style={{ margin: '0 0 5px 0', fontSize: '1.5rem' }}>SenangPay Simulator</h2>
          <p style={{ margin: 0, opacity: 0.9, fontSize: '0.9rem' }}>
            This simulates the SenangPay payment page
          </p>
        </div>

        {/* Payment Details */}
        <div style={{ padding: '30px' }}>
          <div style={{
            background: '#f8f9fa',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '25px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#333', fontSize: '1.1rem' }}>
              Order Details
            </h3>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Order ID:</span>
              <div style={{ fontWeight: '600', color: '#333' }}>{paymentData.order_id}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Description:</span>
              <div style={{ fontWeight: '500', color: '#333' }}>{paymentData.detail}</div>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <span style={{ color: '#666', fontSize: '0.9rem' }}>Customer:</span>
              <div style={{ fontWeight: '500', color: '#333' }}>{paymentData.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#666' }}>{paymentData.email}</div>
            </div>

            <div style={{
              borderTop: '2px dashed #ddd',
              marginTop: '15px',
              paddingTop: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '1.1rem', fontWeight: '600' }}>Total Amount:</span>
              <span style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4CAF50' }}>
                RM {amountRM}
              </span>
            </div>
          </div>

          {/* Mock Card Input (Visual Only) */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#333' }}>
              Card Number (Mock)
            </label>
            <input
              type="text"
              value="4111 1111 1111 1111"
              disabled
              style={{
                width: '100%',
                padding: '12px 15px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '1rem',
                background: '#f5f5f5',
                color: '#666'
              }}
            />
            <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
              <input
                type="text"
                value="12/28"
                disabled
                placeholder="MM/YY"
                style={{
                  flex: 1,
                  padding: '12px 15px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  color: '#666'
                }}
              />
              <input
                type="text"
                value="123"
                disabled
                placeholder="CVV"
                style={{
                  width: '100px',
                  padding: '12px 15px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  background: '#f5f5f5',
                  color: '#666'
                }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button
              onClick={() => handlePayment('success')}
              disabled={processing}
              style={{
                width: '100%',
                padding: '16px',
                background: processing ? '#ccc' : '#4CAF50',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: '600',
                cursor: processing ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s'
              }}
            >
              {processing ? 'Processing...' : `Pay RM ${amountRM}`}
            </button>

            <button
              onClick={() => handlePayment('fail')}
              disabled={processing}
              style={{
                width: '100%',
                padding: '14px',
                background: '#fff',
                color: '#f44336',
                border: '2px solid #f44336',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '500',
                cursor: processing ? 'not-allowed' : 'pointer',
                opacity: processing ? 0.5 : 1
              }}
            >
              Simulate Failed Payment
            </button>

            <button
              onClick={handleCancel}
              disabled={processing}
              style={{
                width: '100%',
                padding: '14px',
                background: 'transparent',
                color: '#666',
                border: 'none',
                fontSize: '0.95rem',
                cursor: processing ? 'not-allowed' : 'pointer',
                opacity: processing ? 0.5 : 1
              }}
            >
              Cancel and Return to Checkout
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          background: '#f8f9fa',
          padding: '15px 25px',
          textAlign: 'center',
          borderTop: '1px solid #eee'
        }}>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#999' }}>
            This is a development simulation. No real payment will be processed.
            <br />
            Switch to real SenangPay by setting <code>PAYMENT_MODE=senangpay</code>
          </p>
        </div>
      </div>
    </div>
  );
};

export default MockPayment;
