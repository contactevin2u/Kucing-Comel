// Handle API URL - add https:// if missing (Render's host property returns just hostname)
const getApiUrl = () => {
  const url = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return `https://${url}`;
};

const API_URL = getApiUrl();

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  };
};

const handleResponse = async (response) => {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
};

export const api = {
  // Auth
  register: async (userData) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return handleResponse(res);
  },

  login: async (credentials) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return handleResponse(res);
  },

  getMe: async () => {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Products - pass auth header to get member pricing if logged in
  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/products?${query}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getProduct: async (id) => {
    const res = await fetch(`${API_URL}/api/products/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getCategories: async () => {
    const res = await fetch(`${API_URL}/api/products/categories`);
    return handleResponse(res);
  },

  // Cart
  getCart: async () => {
    const res = await fetch(`${API_URL}/api/cart`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  addToCart: async (productId, quantity = 1, variantId = null) => {
    const body = { product_id: productId, quantity };
    if (variantId) body.variant_id = variantId;

    const res = await fetch(`${API_URL}/api/cart/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  },

  updateCartItem: async (itemId, quantity) => {
    const res = await fetch(`${API_URL}/api/cart/update`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ item_id: itemId, quantity })
    });
    return handleResponse(res);
  },

  removeFromCart: async (itemId) => {
    const res = await fetch(`${API_URL}/api/cart/remove/${itemId}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  clearCart: async () => {
    const res = await fetch(`${API_URL}/api/cart/clear`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Orders
  getOrders: async () => {
    const res = await fetch(`${API_URL}/api/orders`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  getOrder: async (id) => {
    const res = await fetch(`${API_URL}/api/orders/${id}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  createOrder: async (shippingData) => {
    const res = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(shippingData)
    });
    return handleResponse(res);
  },

  // Guest orders (no auth required)
  createGuestOrder: async (orderData) => {
    const res = await fetch(`${API_URL}/api/orders/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });
    return handleResponse(res);
  },

  getGuestOrder: async (orderId, email) => {
    const res = await fetch(`${API_URL}/api/orders/guest/${orderId}?email=${encodeURIComponent(email)}`);
    return handleResponse(res);
  },

  // Payments
  createPaymentIntent: async (orderId) => {
    const res = await fetch(`${API_URL}/api/payments/create-intent`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ order_id: orderId })
    });
    return handleResponse(res);
  },

  getPaymentStatus: async (orderId) => {
    const res = await fetch(`${API_URL}/api/payments/status/${orderId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // SenangPay
  getSenangPayConfig: async () => {
    const res = await fetch(`${API_URL}/api/senangpay/config`);
    return handleResponse(res);
  },

  initiateSenangPayPayment: async (orderId, guestEmail = null) => {
    const body = { order_id: orderId };
    if (guestEmail) {
      body.guest_email = guestEmail;
    }
    const res = await fetch(`${API_URL}/api/senangpay/initiate`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(body)
    });
    return handleResponse(res);
  },

  getSenangPayStatus: async (orderId) => {
    const res = await fetch(`${API_URL}/api/senangpay/status/${orderId}`, {
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Mock payment processing (for development when SenangPay not approved)
  processMockPayment: async (orderId, action) => {
    const res = await fetch(`${API_URL}/api/senangpay/mock-process`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ order_id: orderId, action })
    });
    return handleResponse(res);
  },

  // Variant Images
  getVariantImages: async (productSlug, variantName) => {
    const res = await fetch(`${API_URL}/api/variant-images/${productSlug}/variant/${encodeURIComponent(variantName)}`);
    return handleResponse(res);
  },

  getMainImages: async (productSlug) => {
    const res = await fetch(`${API_URL}/api/variant-images/${productSlug}/main`);
    return handleResponse(res);
  },

  // Get the API URL for building image URLs
  getApiUrl: () => API_URL
};
