import React from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';

const getImageUrl = (item) => {
  if (!item) return 'https://via.placeholder.com/100x100?text=No+Image';
  if (item.primary_image_id) {
    return `${api.getApiUrl()}/api/product-images/db/${item.primary_image_id}`;
  }
  if (item.has_db_image) {
    return `${api.getApiUrl()}/api/product-images/db/product/${item.product_id}`;
  }
  const url = item.image_url;
  if (!url) {
    // Fallback: try product image endpoint by product ID (handles guest cart items missing image fields)
    if (item.product_id) {
      return `${api.getApiUrl()}/api/product-images/db/product/${item.product_id}`;
    }
    return 'https://via.placeholder.com/100x100?text=No+Image';
  }
  if (url.startsWith('http')) return url;
  return `${api.getApiUrl()}/api/product-images${encodeURI(url)}`;
};

const CartItem = ({ item }) => {
  const { updateQuantity, removeItem } = useCart();

  const handleQuantityChange = async (newQuantity) => {
    if (newQuantity < 1) return;
    if (newQuantity > item.stock) {
      alert(`Only ${item.stock} items available`);
      return;
    }
    await updateQuantity(item.id, newQuantity);
  };

  const handleRemove = async () => {
    if (window.confirm('Remove this item from cart?')) {
      await removeItem(item.id);
    }
  };

  return (
    <div className="cart-item">
      <img
        src={getImageUrl(item)}
        alt={item.name}
        className="cart-item-image"
      />
      <div className="cart-item-info">
        <Link to={`/product/${item.product_id}`}>
          <h4 className="cart-item-name">{item.name}</h4>
        </Link>
        {item.variant_name && (
          <p className="cart-item-variant">Option: {item.variant_name}</p>
        )}
        <p className="cart-item-price">RM {parseFloat(item.price).toFixed(2)}</p>

        <div className="cart-item-actions">
          <div className="quantity-selector">
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(item.quantity - 1)}
            >
              -
            </button>
            <span className="quantity-value">{item.quantity}</span>
            <button
              className="quantity-btn"
              onClick={() => handleQuantityChange(item.quantity + 1)}
            >
              +
            </button>
          </div>
          <button onClick={handleRemove} className="remove-btn">
            Remove
          </button>
        </div>
      </div>
      <div style={{ textAlign: 'right', minWidth: '100px' }}>
        <strong>RM {(parseFloat(item.price) * item.quantity).toFixed(2)}</strong>
      </div>
    </div>
  );
};

export default CartItem;
