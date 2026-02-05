# Admin Dashboard Documentation

## Overview

A production-ready admin dashboard for managing orders, customers, and viewing financial analytics. The dashboard includes:

- Secure admin-only authentication
- Real-time order management
- Financial breakdown with SenangPay fee calculations
- Customer management
- Export functionality

## Quick Start

### 1. Create an Admin User

```bash
cd backend
npm run create-admin admin@kucingcomel.com YourSecurePassword123 "Admin Name"
```

### 2. Access the Admin Dashboard

Navigate to: `http://localhost:3000/admin/login`

### 3. Login with Admin Credentials

Use the email and password you created in step 1.

---

## Features

### Dashboard Summary

- **Total Orders**: All orders in the system
- **Total Revenue**: Sum of all paid orders
- **Net Earnings**: Revenue after all fees
- **Pending Orders**: Orders awaiting action
- **SenangPay Fees**: Total transaction fees paid
- **Delivery Fees**: Total delivery fees collected
- **Daily/Weekly/Monthly**: Revenue breakdown by period

### Order Management

- View all orders with search and filters
- Filter by order status (Pending, Confirmed, Processing, Shipped, Delivered, Cancelled)
- Filter by payment status (Paid, Unpaid, Failed)
- Search by Order ID, customer name, email, or phone
- Update order and payment status
- Export orders to CSV

### Financial Breakdown (Per Order)

Each order displays:

| Field | Description |
|-------|-------------|
| Product Total | Sum of all items in the order |
| Delivery Fee | Shipping cost (default: RM 8.00) |
| Order Total | Product Total + Delivery Fee |
| SenangPay Fee | Transaction fee based on payment method |
| Total Fees | Sum of all fees |
| **Net Earnings** | **Order Total - Total Fees** |

---

## SenangPay Fee Structure

The following fees are automatically calculated based on payment method:

| Payment Method | Fee Rate | Minimum Fee |
|---------------|----------|-------------|
| FPX (Online Banking) | 1.5% | RM 1.00 |
| Credit/Debit Card | 2.5% | RM 0.65 |
| E-Wallet (TNG/Boost) | 1.5% | RM 0.65 |
| SPayLater | 2.0% | - |
| Atome | 5.5% | - |
| GrabPay Later | 6.0% | - |

**Fee Calculation**: `MAX(Order Total × Rate%, Minimum Fee)`

### Updating Fee Rates

Edit the file: `backend/src/config/fees.js`

```javascript
const SENANGPAY_FEES = {
  fpx: {
    name: 'FPX (Online Banking)',
    percentage: 0.015, // 1.5%
    minimum: 1.00,     // RM 1.00
  },
  // ... other payment methods
};
```

Restart the backend after making changes.

---

## API Endpoints

All admin endpoints require authentication with admin role.

### Dashboard

```
GET /api/admin/dashboard
```

Returns summary statistics.

### Orders

```
GET /api/admin/orders
GET /api/admin/orders/:id
PATCH /api/admin/orders/:id/status
GET /api/admin/orders/export
```

Query parameters for `/api/admin/orders`:
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 50)
- `status` - Filter by order status
- `payment_status` - Filter by payment status
- `search` - Search by ID, name, email, or phone

### Statistics

```
GET /api/admin/stats/daily?days=30
GET /api/admin/stats/monthly?months=12
```

### Customers

```
GET /api/admin/customers
```

### Configuration

```
GET /api/admin/config/fees
```

---

## Security

### Authentication

- JWT-based authentication
- Token stored in localStorage as `adminToken`
- User must have `role: 'admin'` to access

### Best Practices

1. **Strong Passwords**: Use strong, unique passwords for admin accounts
2. **HTTPS**: Always use HTTPS in production
3. **Token Expiry**: Tokens expire after 7 days
4. **No Search Indexing**: Admin pages include `noindex` meta tag

### Revoking Access

To remove admin access from a user:

```sql
UPDATE users SET role = 'customer' WHERE email = 'admin@example.com';
```

---

## Database Schema Changes

The admin dashboard adds the following column to the `orders` table:

```sql
ALTER TABLE orders ADD COLUMN delivery_fee DECIMAL(10, 2) DEFAULT 8.00;
```

This migration runs automatically on server startup.

---

## File Structure

```
backend/
├── src/
│   ├── config/
│   │   └── fees.js              # Fee configuration
│   ├── controllers/
│   │   └── adminController.js   # Admin API logic
│   ├── middleware/
│   │   └── adminAuth.js         # Admin auth middleware
│   ├── routes/
│   │   └── admin.js             # Admin routes
│   └── db/
│       └── create-admin.js      # Admin creation script

frontend/
├── src/
│   └── admin/
│       ├── AdminApp.jsx         # Main admin app
│       ├── admin.css            # Admin styles
│       ├── index.js             # Export
│       └── pages/
│           ├── AdminLogin.jsx
│           ├── AdminDashboard.jsx
│           ├── AdminOrders.jsx
│           ├── AdminOrderDetail.jsx
│           ├── AdminCustomers.jsx
│           └── AdminSettings.jsx
```

---

## Deployment

### Environment Variables

Ensure these are set in production:

```env
JWT_SECRET=your-secure-jwt-secret
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain.com
```

### Create Production Admin

After deploying, SSH into your server and run:

```bash
cd backend
npm run create-admin admin@yourdomain.com SecurePassword123 "Admin Name"
```

---

## Troubleshooting

### "Access denied. Admin privileges required."

The user exists but doesn't have admin role. Run the create-admin script to promote them:

```bash
npm run create-admin existing@email.com anypassword "Name"
```

### Dashboard shows no data

1. Check that orders exist in the database
2. Verify the backend is running
3. Check browser console for API errors
4. Verify `REACT_APP_API_URL` is set correctly

### Fee calculations seem wrong

1. Check `backend/src/config/fees.js` for correct rates
2. Verify the payment_method field in orders table
3. The fee type is mapped from `payment_method` using `mapPaymentMethodToFeeType()`

---

## Support

For issues, check the repository issues or contact the development team.
