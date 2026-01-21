# Kucing Comel - E-Commerce Blueprint

## Tech Stack Recommendation

| Layer | Technology | Reason |
|-------|------------|--------|
| Frontend | React.js | Simple, component-based, large ecosystem |
| Backend | Node.js + Express | JavaScript full-stack, easy REST APIs |
| Database | PostgreSQL | Reliable, free on Render.com |
| Payment | Stripe | Developer-friendly, secure, global |
| Deployment | Render.com | Easy deployment, free tier available |

---

## System Architecture (Text-Based Diagram)

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│                    (React.js - Render Static Site)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Home/   │ │ Product  │ │   Cart   │ │ Checkout │           │
│  │ Listing  │ │  Detail  │ │   Page   │ │   Page   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS (REST API)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                 │
│                 (Node.js + Express - Render Web Service)        │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    API ROUTES                             │  │
│  │  /api/auth    /api/products    /api/cart    /api/orders  │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MIDDLEWARE & SERVICES                        │  │
│  │  Auth (JWT)  │  Validation  │  Stripe Integration        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ SQL Queries
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE                                  │
│                 (PostgreSQL - Render Database)                  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │  users  │ │products │ │  carts  │ │ orders  │ │order_   │  │
│  │         │ │         │ │         │ │         │ │ items   │  │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   PAYMENT GATEWAY                               │
│                       (Stripe)                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Create Payment Intent  →  Process Card  →  Webhook      │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Tables

#### 1. users
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. products
```sql
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(100),
    stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. carts
```sql
CREATE TABLE carts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. cart_items
```sql
CREATE TABLE cart_items (
    id SERIAL PRIMARY KEY,
    cart_id INTEGER REFERENCES carts(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. orders
```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    payment_status VARCHAR(50) DEFAULT 'unpaid',
    payment_intent_id VARCHAR(255),
    shipping_address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. order_items
```sql
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
    product_name VARCHAR(255) NOT NULL,
    product_price DECIMAL(10, 2) NOT NULL,
    quantity INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | Get all products |
| GET | /api/products/:id | Get single product |
| POST | /api/products | Create product (admin) |
| PUT | /api/products/:id | Update product (admin) |
| DELETE | /api/products/:id | Delete product (admin) |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/cart | Get user's cart |
| POST | /api/cart/add | Add item to cart |
| PUT | /api/cart/update | Update cart item quantity |
| DELETE | /api/cart/remove/:itemId | Remove item from cart |
| DELETE | /api/cart/clear | Clear entire cart |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/orders | Get user's orders |
| GET | /api/orders/:id | Get single order |
| POST | /api/orders | Create order from cart |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/create-intent | Create Stripe payment intent |
| POST | /api/payments/webhook | Stripe webhook handler |

---

## Project Folder Structure

```
kucing-comel/
├── render.yaml                 # Render.com deployment config
├── README.md
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── src/
│   │   ├── index.js           # Entry point
│   │   ├── config/
│   │   │   └── database.js    # Database connection
│   │   ├── middleware/
│   │   │   ├── auth.js        # JWT authentication
│   │   │   └── errorHandler.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── products.js
│   │   │   ├── cart.js
│   │   │   ├── orders.js
│   │   │   └── payments.js
│   │   ├── controllers/
│   │   │   ├── authController.js
│   │   │   ├── productController.js
│   │   │   ├── cartController.js
│   │   │   ├── orderController.js
│   │   │   └── paymentController.js
│   │   └── db/
│   │       ├── schema.sql     # Database schema
│   │       └── seed.sql       # Sample data
│   │
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── index.js
│   │   ├── App.js
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── ProductCard.jsx
│   │   │   ├── CartItem.jsx
│   │   │   └── Footer.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── ProductDetail.jsx
│   │   │   ├── Cart.jsx
│   │   │   ├── Checkout.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── Orders.jsx
│   │   ├── context/
│   │   │   ├── AuthContext.jsx
│   │   │   └── CartContext.jsx
│   │   ├── services/
│   │   │   └── api.js
│   │   └── styles/
│   │       └── index.css
```

---

## Security Best Practices Implemented

1. **Password Hashing** - bcrypt with salt rounds
2. **JWT Authentication** - Secure token-based auth
3. **Input Validation** - Sanitize all user inputs
4. **CORS Configuration** - Restrict allowed origins
5. **Environment Variables** - Secrets not in code
6. **SQL Injection Prevention** - Parameterized queries
7. **HTTPS** - Enforced by Render.com
8. **Stripe Webhook Verification** - Signature validation

---

## Deployment Steps (Render.com)

1. Push code to GitHub
2. Create PostgreSQL database on Render
3. Create Web Service for backend
4. Create Static Site for frontend
5. Set environment variables
6. Configure Stripe webhooks

See `render.yaml` for Infrastructure as Code deployment.
