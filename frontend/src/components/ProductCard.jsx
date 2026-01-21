import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product }) => {
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const result = await addToCart(product.id, 1);
    if (result.success) {
      alert('Added to cart!');
    } else {
      alert(result.error || 'Failed to add to cart');
    }
  };

  return (
    <div className="product-card">
      <Link to={`/product/${product.id}`}>
        <img
          src={product.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
          alt={product.name}
          className="product-image"
        />
        <div className="product-info">
          <span className="product-category">{product.category}</span>
          <h3 className="product-name">{product.name}</h3>
          <p className="product-price">RM {parseFloat(product.price).toFixed(2)}</p>
        </div>
      </Link>
      <div className="product-info">
        <div className="product-actions">
          <Link to={`/product/${product.id}`} className="btn btn-outline btn-sm">
            View
          </Link>
          <button
            onClick={handleAddToCart}
            className="btn btn-primary btn-sm"
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
