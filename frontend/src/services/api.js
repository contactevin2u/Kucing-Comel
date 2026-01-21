const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

  // Products
  getProducts: async (params = {}) => {
    const query = new URLSearchParams(params).toString();
    const res = await fetch(`${API_URL}/api/products?${query}`);
    return handleResponse(res);
  },

  getProduct: async (id) => {
    const res = await fetch(`${API_URL}/api/products/${id}`);
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

  addToCart: async (productId, quantity = 1) => {
    const res = await fetch(`${API_URL}/api/cart/add`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ product_id: productId, quantity })
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
  }
};
