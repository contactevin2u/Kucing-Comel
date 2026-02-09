/**
 * Email Service for Order Confirmations & Shipping Notifications
 */

const nodemailer = require('nodemailer');

// Create transporter based on environment
const createTransporter = () => {
  // For development/testing - use console logging if no SMTP configured
  if (!process.env.SMTP_HOST || process.env.SMTP_HOST === 'your-smtp-host') {
    console.log('[EMAIL] No SMTP configured - emails will be logged to console');
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });
};

let transporter = null;

// Initialize transporter
const initTransporter = () => {
  if (!transporter) {
    transporter = createTransporter();
  }
  return transporter;
};

/**
 * Generate tracking URL based on courier name
 */
const getTrackingUrl = (courierName, trackingNumber) => {
  const courier = (courierName || '').toLowerCase();
  if (courier.includes('spx')) return `https://www.tracking.my/spx/${trackingNumber}`;
  if (courier.includes('j&t') || courier.includes('jnt')) return `https://www.tracking.my/jnt/${trackingNumber}`;
  if (courier.includes('pos laju') || courier.includes('poslaju')) return `https://www.tracking.my/poslaju/${trackingNumber}`;
  if (courier.includes('dhl')) return `https://www.tracking.my/dhl/${trackingNumber}`;
  return `https://www.tracking.my/${trackingNumber}`;
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmation = async (orderData) => {
  const {
    email,
    orderId,
    totalAmount,
    shippingName,
    shippingAddress,
    shippingPhone,
    items = [],
    transactionId,
  } = orderData;

  if (!email) {
    console.error('[EMAIL] No email address provided for order confirmation');
    return { success: false, error: 'No email address' };
  }

  const fromName = process.env.SMTP_FROM_NAME || 'PetPals Hub';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@petpalshub.com';

  // Generate items HTML
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">RM ${(item.product_price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join('');

  // Email HTML template
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000; margin: 0;">PetPals Hub</h1>
        <p style="color: #666; margin: 5px 0;">Your one-stop shop for pet products</p>
      </div>

      <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #4CAF50; margin-top: 0;">Order Confirmed!</h2>
        <p>Thank you for your order, <strong>${shippingName}</strong>!</p>
        <p>Your payment has been received and your order is being processed.</p>
        <p style="color: #555; font-size: 0.95em;">We'll send you another email with tracking information once your order has been shipped.</p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #333;">Order Details</h3>
        <p><strong>Order ID:</strong> #${orderId}</p>
        ${transactionId ? `<p><strong>Transaction ID:</strong> ${transactionId}</p>` : ''}

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 10px; text-align: left;">Item</th>
              <th style="padding: 10px; text-align: center;">Qty</th>
              <th style="padding: 10px; text-align: right;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="2" style="padding: 15px 10px; text-align: right; font-weight: bold;">Total:</td>
              <td style="padding: 15px 10px; text-align: right; font-weight: bold;">RM ${parseFloat(totalAmount).toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #333;">Shipping Information</h3>
        <p><strong>${shippingName}</strong></p>
        <p>${shippingAddress}</p>
        <p>Phone: ${shippingPhone}</p>
      </div>

      <div style="text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p>If you have any questions, reply to this email or contact us at petpalshubsb@gmail.com</p>
        <p style="margin-top: 20px;">
          <a href="http://app.senangpay.my/policy/5501769075421851" style="color: #666; margin: 0 10px;">Terms & Conditions</a> |
          <a href="http://app.senangpay.my/policy/5501769075421852" style="color: #666; margin: 0 10px;">Privacy Policy</a> |
          <a href="http://app.senangpay.my/policy/5501769075421854" style="color: #666; margin: 0 10px;">Refund Policy</a>
        </p>
        <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} PetPals Hub. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  // Plain text version
  const textContent = `
PetPals Hub - Order Confirmation

Thank you for your order, ${shippingName}!

Your payment has been received and your order is being processed.
We'll send you another email with tracking information once your order has been shipped.

ORDER DETAILS
-------------
Order ID: #${orderId}
${transactionId ? `Transaction ID: ${transactionId}` : ''}

Items:
${items.map(item => `- ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} x ${item.quantity} - RM ${(item.product_price * item.quantity).toFixed(2)}`).join('\n')}

Total: RM ${parseFloat(totalAmount).toFixed(2)}

SHIPPING TO
-----------
${shippingName}
${shippingAddress}
Phone: ${shippingPhone}

If you have any questions, contact us at petpalshubsb@gmail.com

© ${new Date().getFullYear()} PetPals Hub
  `;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Order Confirmed - #${orderId} | PetPals Hub`,
    text: textContent,
    html: htmlContent,
  };

  // If no transporter (dev mode), log to console
  const transport = initTransporter();
  if (!transport) {
    console.log('[EMAIL] ========== ORDER CONFIRMATION EMAIL ==========');
    console.log(`[EMAIL] To: ${email}`);
    console.log(`[EMAIL] Subject: ${mailOptions.subject}`);
    console.log(`[EMAIL] Order ID: #${orderId}`);
    console.log(`[EMAIL] Total: RM ${parseFloat(totalAmount).toFixed(2)}`);
    console.log(`[EMAIL] Items: ${items.length}`);
    console.log('[EMAIL] ================================================');
    return { success: true, mode: 'console' };
  }

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] Order confirmation sent to ${email} - Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send order confirmation to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Send shipping notification email
 * @param {Object} orderData - Order details
 * @param {string} orderData.email - Customer email
 * @param {number} orderData.orderId - Order ID
 * @param {string} orderData.shippingName - Customer name
 * @param {string} orderData.trackingNumber - Tracking number
 * @param {string} orderData.courierName - Courier name (e.g. 'SPX Express')
 * @param {Array} orderData.items - Order items
 * @param {number} orderData.totalAmount - Order total
 */
const sendShippingNotification = async (orderData) => {
  const {
    email,
    orderId,
    shippingName,
    trackingNumber,
    courierName = 'SPX Express',
    items = [],
    totalAmount,
  } = orderData;

  if (!email) {
    console.error('[EMAIL] No email address provided for shipping notification');
    return { success: false, error: 'No email address' };
  }

  const fromName = process.env.SMTP_FROM_NAME || 'PetPals Hub';
  const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || 'noreply@petpalshub.com';

  const trackingUrl = getTrackingUrl(courierName, trackingNumber);

  // Generate items HTML
  const itemsHtml = items.map(item => `
    <tr>
      <td style="padding: 8px 10px; border-bottom: 1px solid #eee;">${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''}</td>
      <td style="padding: 8px 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
    </tr>
  `).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #000; margin: 0;">PetPals Hub</h1>
        <p style="color: #666; margin: 5px 0;">Your one-stop shop for pet products</p>
      </div>

      <div style="background: #e8f5e9; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h2 style="color: #2e7d32; margin-top: 0;">Your order has been shipped!</h2>
        <p>Great news, <strong>${shippingName}</strong>! Your order <strong>#${orderId}</strong> is on its way.</p>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #333;">Tracking Information</h3>
        <table style="width: 100%; margin: 10px 0;">
          <tr>
            <td style="padding: 8px 0; color: #666;">Courier:</td>
            <td style="padding: 8px 0; font-weight: 600;">${courierName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;">Tracking Number:</td>
            <td style="padding: 8px 0; font-weight: 600; font-family: monospace; font-size: 1.1em;">${trackingNumber}</td>
          </tr>
        </table>
        <div style="text-align: center; margin-top: 15px;">
          <a href="${trackingUrl}" style="display: inline-block; background: #4CAF50; color: #fff; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: 600;">Track Your Parcel</a>
        </div>
      </div>

      <div style="background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="margin-top: 0; color: #333;">Items in This Shipment</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 8px 10px; text-align: left;">Item</th>
              <th style="padding: 8px 10px; text-align: center;">Qty</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        ${totalAmount ? `<p style="text-align: right; margin-top: 10px; font-weight: 600;">Order Total: RM ${parseFloat(totalAmount).toFixed(2)}</p>` : ''}
      </div>

      <div style="text-align: center; color: #666; font-size: 0.9em; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
        <p>If you have any questions about your delivery, reply to this email or contact us at petpalshubsb@gmail.com</p>
        <p style="margin-top: 15px;">&copy; ${new Date().getFullYear()} PetPals Hub. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;

  const textContent = `
PetPals Hub - Your Order Has Been Shipped!

Great news, ${shippingName}! Your order #${orderId} is on its way.

TRACKING INFORMATION
--------------------
Courier: ${courierName}
Tracking Number: ${trackingNumber}
Track your parcel: ${trackingUrl}

ITEMS IN THIS SHIPMENT
----------------------
${items.map(item => `- ${item.product_name}${item.variant_name ? ` (${item.variant_name})` : ''} x ${item.quantity}`).join('\n')}
${totalAmount ? `\nOrder Total: RM ${parseFloat(totalAmount).toFixed(2)}` : ''}

If you have any questions, contact us at petpalshubsb@gmail.com

© ${new Date().getFullYear()} PetPals Hub
  `;

  const mailOptions = {
    from: `"${fromName}" <${fromEmail}>`,
    to: email,
    subject: `Your order has been shipped! - #${orderId} | PetPals Hub`,
    text: textContent,
    html: htmlContent,
  };

  // If no transporter (dev mode), log to console
  const transport = initTransporter();
  if (!transport) {
    console.log('[EMAIL] ========== SHIPPING NOTIFICATION EMAIL ==========');
    console.log(`[EMAIL] To: ${email}`);
    console.log(`[EMAIL] Subject: ${mailOptions.subject}`);
    console.log(`[EMAIL] Order ID: #${orderId}`);
    console.log(`[EMAIL] Courier: ${courierName}`);
    console.log(`[EMAIL] Tracking: ${trackingNumber}`);
    console.log(`[EMAIL] Tracking URL: ${trackingUrl}`);
    console.log('[EMAIL] ==================================================');
    return { success: true, mode: 'console' };
  }

  try {
    const info = await transport.sendMail(mailOptions);
    console.log(`[EMAIL] Shipping notification sent to ${email} - Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[EMAIL] Failed to send shipping notification to ${email}:`, error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Get order details with items for email
 * @param {Object} db - Database module (with query function)
 * @param {number} orderId - Order ID
 */
const getOrderDetailsForEmail = async (db, orderId) => {
  try {
    // Get order details (works with both PostgreSQL and SQLite)
    const orderResult = await db.query(`
      SELECT o.*, u.email as user_email
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = $1
    `, [orderId]);

    if (!orderResult.rows || orderResult.rows.length === 0) {
      return null;
    }

    const order = orderResult.rows[0];

    // Get order items
    const itemsResult = await db.query(
      'SELECT * FROM order_items WHERE order_id = $1',
      [orderId]
    );

    // Determine email (user email or guest email)
    const email = order.user_email || order.guest_email;

    return {
      email,
      orderId: order.id,
      totalAmount: order.total_amount,
      shippingName: order.shipping_name,
      shippingAddress: order.shipping_address,
      shippingPhone: order.shipping_phone,
      transactionId: order.transaction_id,
      trackingNumber: order.tracking_number,
      courierName: order.courier_name,
      items: itemsResult.rows || [],
    };
  } catch (error) {
    console.error('[EMAIL] Error fetching order details:', error.message);
    return null;
  }
};

module.exports = {
  sendOrderConfirmation,
  sendShippingNotification,
  getOrderDetailsForEmail,
};
