# Kucing Comel - E-Commerce Cat Shop

A full-stack e-commerce website for cat products built with React, Node.js, PostgreSQL, and Stripe.

## Features

- **Frontend**: Clean, responsive UI with product listing, detail pages, cart, and checkout
- **Backend**: RESTful API with JWT authentication
- **Database**: PostgreSQL with full schema for users, products, orders
- **Payments**: Stripe integration for secure card payments
- **Deployment**: Ready for Render.com with Infrastructure as Code

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React.js, React Router |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Payments | Stripe |
| Deployment | Render.com |

## Project Structure

```
kucing-comel/
├── render.yaml              # Render.com deployment config
├── BLUEPRINT.md             # Full system architecture
├── backend/
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── index.js         # Entry point
│       ├── config/          # Database config
│       ├── middleware/      # Auth, error handling
│       ├── routes/          # API routes
│       ├── controllers/     # Business logic
│       └── db/              # SQL schema & seeds
└── frontend/
    ├── package.json
    ├── .env.example
    ├── public/
    └── src/
        ├── components/      # Reusable UI components
        ├── pages/           # Page components
        ├── context/         # Auth & Cart state
        ├── services/        # API client
        └── styles/          # CSS
```

## Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Stripe account (for payments)

### 1. Clone the repository

```bash
git clone https://github.com/contactevin2u/Kucing-Comel.git
cd Kucing-Comel
```

### 2. Set up the database

```bash
# Create database
psql -U postgres -c "CREATE DATABASE kucing_comel;"

# Run schema
psql -U postgres -d kucing_comel -f backend/src/db/schema.sql

# Seed sample data
psql -U postgres -d kucing_comel -f backend/src/db/seed.sql
```

### 3. Configure Backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/kucing_comel
JWT_SECRET=your-secret-key-here
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
FRONTEND_URL=http://localhost:3000
PORT=5000
```

### 4. Configure Frontend

```bash
cd frontend
cp .env.example .env
```

Edit `.env`:
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_key
```

### 5. Install dependencies & run

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install
npm start
```

Visit `http://localhost:3000`

## Deployment to Render.com

### Option 1: Blueprint (Recommended)

1. Push code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com)
3. Click **New** → **Blueprint**
4. Connect your GitHub repo
5. Render will automatically create:
   - PostgreSQL database
   - Backend web service
   - Frontend static site

### Option 2: Manual Setup

#### 1. Create PostgreSQL Database

- Go to Render Dashboard → New → PostgreSQL
- Name: `kucing-comel-db`
- Region: Singapore
- Plan: Free

#### 2. Create Backend Service

- New → Web Service
- Connect GitHub repo
- Settings:
  - Name: `kucing-comel-api`
  - Root Directory: `backend`
  - Build Command: `npm install`
  - Start Command: `npm start`
- Environment Variables:
  - `DATABASE_URL`: (from database)
  - `JWT_SECRET`: (generate a secure key)
  - `STRIPE_SECRET_KEY`: (from Stripe)
  - `STRIPE_WEBHOOK_SECRET`: (from Stripe)
  - `NODE_ENV`: `production`

#### 3. Create Frontend

- New → Static Site
- Connect GitHub repo
- Settings:
  - Name: `kucing-comel-frontend`
  - Root Directory: `frontend`
  - Build Command: `npm install && npm run build`
  - Publish Directory: `build`
- Environment Variables:
  - `REACT_APP_API_URL`: (backend URL)
  - `REACT_APP_STRIPE_PUBLIC_KEY`: (from Stripe)

#### 4. Configure Stripe Webhook

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://your-backend-url.onrender.com/api/payments/webhook`
3. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy signing secret to `STRIPE_WEBHOOK_SECRET`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register user |
| POST | /api/auth/login | Login user |
| GET | /api/auth/me | Get current user |

### Products
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/products | List products |
| GET | /api/products/:id | Get product |
| GET | /api/products/categories | List categories |

### Cart
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/cart | Get cart |
| POST | /api/cart/add | Add to cart |
| PUT | /api/cart/update | Update quantity |
| DELETE | /api/cart/remove/:id | Remove item |

### Orders
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/orders | List orders |
| POST | /api/orders | Create order |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/payments/create-intent | Create payment |
| POST | /api/payments/webhook | Stripe webhook |

## Security

- Passwords hashed with bcrypt
- JWT authentication
- CORS configured
- SQL injection prevention (parameterized queries)
- Stripe webhook signature verification
- HTTPS enforced in production

## License

MIT
