import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';

/**
 * Order Success Page for Guest Checkout
 * Displays order confirmation after successful payment
 */
const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const orderId = searchParams.get('order_id');
  const guestEmail = sessionStorage.getItem('guestEmail');

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError('Order ID not found');
        setLoading(false);
        return;
      }

      try {
        // Try to get order with guest email
        if (guestEmail) {
          const data = await api.getGuestOrder(orderId, guestEmail);
          setOrder(data.order);
        } else {
          setError('Unable to retrieve order details');
        }
      } catch (err) {
        console.error('Failed to fetch order:', err);
        // Order might still be valid, just can't display details
        setOrder({ id: orderId });
      } finally {
        setLoading(false);
        // Clear guest email from session
        sessionStorage.removeItem('guestEmail');
        // Clear guest cart
        localStorage.removeItem('guest_cart');
      }
    };

    fetchOrder();
  }, [orderId, guestEmail]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '80px 20px' }}>
        <p>Loading order details...</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ maxWidth: '600px', margin: '0 auto', padding: '60px 20px' }}>
      {/* Success Icon */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: '#4CAF50',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          fontSize: '40px',
          color: '#fff'
        }}>
          &#10003;
        </div>
        <h1 style={{ color: '#4CAF50', marginBottom: '10px' }}>Payment Successful!</h1>
        <p style={{ color: '#666', fontSize: '1.1rem' }}>
          Thank you for your order
        </p>
      </div>

      {/* Order Details */}
      <div style={{
        background: '#f8f9fa',
        borderRadius: '12px',
        padding: '25px',
        marginBottom: '30px'
      }}>
        <h3 style={{ marginBottom: '20px', color: '#333' }}>Order Details</h3>

        <div style={{ marginBottom: '15px' }}>
          <span style={{ color: '#666' }}>Order Number:</span>
          <div style={{ fontWeight: '600', fontSize: '1.2rem', color: '#333' }}>
            #{orderId}
          </div>
        </div>

        {order?.total_amount && (
          <div style={{ marginBottom: '15px' }}>
            <span style={{ color: '#666' }}>Total Amount:</span>
            <div style={{ fontWeight: '600', fontSize: '1.2rem', color: '#4CAF50' }}>
              RM {parseFloat(order.total_amount).toFixed(2)}
            </div>
          </div>
        )}

        {order?.shipping_name && (
          <div style={{ marginBottom: '15px' }}>
            <span style={{ color: '#666' }}>Shipping To:</span>
            <div style={{ fontWeight: '500', color: '#333' }}>
              {order.shipping_name}
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              {order.shipping_address}
            </div>
          </div>
        )}

        {order?.guest_email && (
          <div style={{ marginBottom: '15px' }}>
            <span style={{ color: '#666' }}>Confirmation Email:</span>
            <div style={{ fontWeight: '500', color: '#333' }}>
              {order.guest_email}
            </div>
          </div>
        )}

        {order?.items && order.items.length > 0 && (
          <div>
            <span style={{ color: '#666' }}>Items:</span>
            {order.items.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: index < order.items.length - 1 ? '1px solid #e0e0e0' : 'none'
              }}>
                <span>{item.product_name} x {item.quantity}</span>
                <span>RM {(parseFloat(item.product_price) * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* What's Next */}
      <div style={{
        background: '#e3f2fd',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '30px'
      }}>
        <h4 style={{ color: '#1565C0', marginBottom: '10px' }}>What's Next?</h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#1565C0' }}>
          <li style={{ marginBottom: '8px' }}>You will receive an order confirmation email shortly</li>
          <li style={{ marginBottom: '8px' }}>We will process your order within 1-2 business days</li>
          <li>You will be notified when your order ships</li>
        </ul>
      </div>

      {/* Actions */}
      <div style={{ textAlign: 'center' }}>
        <Link
          to="/"
          className="btn btn-primary"
          style={{
            display: 'inline-block',
            padding: '12px 30px',
            marginRight: '15px'
          }}
        >
          Continue Shopping
        </Link>
        <Link
          to="/login"
          style={{
            color: '#666',
            textDecoration: 'underline'
          }}
        >
          Create an account to track orders
        </Link>
      </div>
    </div>
  );
};

export default OrderSuccess;
