import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const LOCAL_CART_KEY = 'guest_cart';

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

// Helper to get cart from localStorage
const getLocalCart = () => {
  try {
    const stored = localStorage.getItem(LOCAL_CART_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading local cart:', e);
  }
  return { items: [], total: '0.00', item_count: 0 };
};

// Helper to save cart to localStorage
const saveLocalCart = (cart) => {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cart));
  } catch (e) {
    console.error('Error saving local cart:', e);
  }
};

// Helper to clear local cart
const clearLocalCart = () => {
  localStorage.removeItem(LOCAL_CART_KEY);
};

// Calculate cart totals
const calculateTotals = (items) => {
  const total = items.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);
  const item_count = items.reduce((sum, item) => sum + item.quantity, 0);
  return {
    items,
    total: total.toFixed(2),
    item_count
  };
};

export const CartProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState({ items: [], total: '0.00', item_count: 0 });
  const [loading, setLoading] = useState(false);

  // Fetch cart from server (for authenticated users) or localStorage (for guests)
  const fetchCart = useCallback(async () => {
    if (isAuthenticated) {
      // Authenticated user - fetch from server
      setLoading(true);
      try {
        const data = await api.getCart();
        setCart(data);
        // Clear any local cart since user is logged in
        clearLocalCart();
      } catch (error) {
        console.error('Failed to fetch cart:', error);
      } finally {
        setLoading(false);
      }
    } else {
      // Guest - use localStorage
      const localCart = getLocalCart();
      setCart(localCart);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const addToCart = async (productId, quantity = 1, variantId = null) => {
    if (isAuthenticated) {
      // Authenticated user - use server API
      try {
        const data = await api.addToCart(productId, quantity, variantId);
        setCart(data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Guest - use localStorage
      try {
        // Fetch product details
        const product = await api.getProduct(productId);

        const localCart = getLocalCart();
        const existingIndex = localCart.items.findIndex(
          item => item.product_id === productId && item.variant_id === variantId
        );

        if (existingIndex >= 0) {
          localCart.items[existingIndex].quantity += quantity;
        } else {
          localCart.items.push({
            id: `local-${Date.now()}`,
            product_id: productId,
            variant_id: variantId,
            name: product.name,
            price: product.price,
            image_url: product.image_url,
            quantity
          });
        }

        const updatedCart = calculateTotals(localCart.items);
        saveLocalCart(updatedCart);
        setCart(updatedCart);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    if (isAuthenticated) {
      try {
        const data = await api.updateCartItem(itemId, quantity);
        setCart(data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Guest - update localStorage
      const localCart = getLocalCart();
      const itemIndex = localCart.items.findIndex(item => item.id === itemId);

      if (itemIndex >= 0) {
        if (quantity <= 0) {
          localCart.items.splice(itemIndex, 1);
        } else {
          localCart.items[itemIndex].quantity = quantity;
        }

        const updatedCart = calculateTotals(localCart.items);
        saveLocalCart(updatedCart);
        setCart(updatedCart);
      }
      return { success: true };
    }
  };

  const removeItem = async (itemId) => {
    if (isAuthenticated) {
      try {
        const data = await api.removeFromCart(itemId);
        setCart(data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Guest - remove from localStorage
      const localCart = getLocalCart();
      localCart.items = localCart.items.filter(item => item.id !== itemId);

      const updatedCart = calculateTotals(localCart.items);
      saveLocalCart(updatedCart);
      setCart(updatedCart);
      return { success: true };
    }
  };

  const clearCart = async () => {
    if (isAuthenticated) {
      try {
        const data = await api.clearCart();
        setCart(data);
        return { success: true };
      } catch (error) {
        return { success: false, error: error.message };
      }
    } else {
      // Guest - clear localStorage
      clearLocalCart();
      setCart({ items: [], total: '0.00', item_count: 0 });
      return { success: true };
    }
  };

  // Get cart items formatted for guest order API
  const getCartItemsForOrder = () => {
    return cart.items.map(item => ({
      product_id: item.product_id,
      quantity: item.quantity,
      variant_id: item.variant_id || null
    }));
  };

  const value = {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    refreshCart: fetchCart,
    getCartItemsForOrder,
    isGuestCart: !isAuthenticated
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
