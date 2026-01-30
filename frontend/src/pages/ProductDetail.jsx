import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import ImageGallery from '../components/ImageGallery';

const getImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/500x400?text=No+Image';
  if (url.startsWith('http')) return url;
  // Handle API-served images (already encoded by backend)
  if (url.startsWith('/api/')) {
    return `${api.getApiUrl()}${url}`;
  }
  // Backend serves product images from /api/product-images
  return `${api.getApiUrl()}/api/product-images${encodeURI(url)}`;
};

// Map product names to their slugs for gallery images
const getProductSlug = (productName) => {
  if (!productName) return null;
  const lower = productName.toLowerCase();
  const isCarton = lower.includes('carton');
  const prefix = isCarton ? 'carton-litter-6l' : 'litter-6l';

  if (lower.includes('charcoal')) return `${prefix}-charcoal`;
  if (lower.includes('fresh milk')) return `${prefix}-fresh-milk`;
  if (lower.includes('lavender')) return `${prefix}-lavender`;
  return null;
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [variationError, setVariationError] = useState('');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  // Check wishlist status
  useEffect(() => {
    if (isAuthenticated && id) {
      checkWishlistStatus();
    }
  }, [isAuthenticated, id]);

  const checkWishlistStatus = async () => {
    try {
      const data = await api.checkWishlist(id);
      setIsWishlisted(data.inWishlist);
    } catch (error) {
      // Silently fail
    }
  };

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    if (wishlistLoading) return;

    setWishlistLoading(true);
    try {
      if (isWishlisted) {
        await api.removeFromWishlist(id);
        setIsWishlisted(false);
      } else {
        await api.addToWishlist(id);
        setIsWishlisted(true);
      }
    } catch (error) {
      console.error('Wishlist error:', error);
    } finally {
      setWishlistLoading(false);
    }
  };

  // Fetch images when variant changes
  useEffect(() => {
    const fetchVariantImages = async () => {
      if (!product) return;

      const productSlug = getProductSlug(product.name);
      if (!productSlug) {
        setGalleryImages([]);
        return;
      }

      setImagesLoading(true);

      try {
        let response;
        // Only load variant images if a variant is selected (not "Select Variation")
        if (selectedVariant && selectedVariant.variant_name) {
          response = await api.getVariantImages(productSlug, selectedVariant.variant_name);
        } else {
          // Load main/default images when no variant selected
          response = await api.getMainImages(productSlug);
        }

        if (response.images && response.images.length > 0) {
          // Convert API paths to full URLs
          const fullUrls = response.images.map(img => getImageUrl(img));
          setGalleryImages(fullUrls);
        } else {
          setGalleryImages([]);
        }
      } catch (error) {
        console.error('Failed to fetch variant images:', error);
        setGalleryImages([]);
      } finally {
        setImagesLoading(false);
      }
    };

    fetchVariantImages();
  }, [product, selectedVariant]);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const data = await api.getProduct(id);
      setProduct(data.product);
      // DO NOT auto-select first variant - keep it as "Select Variation"
      setSelectedVariant(null);
    } catch (error) {
      console.error('Failed to fetch product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVariantChange = (e) => {
    const variantId = e.target.value;

    // Clear error when user interacts with dropdown
    setVariationError('');

    if (variantId === '' || variantId === 'select') {
      setSelectedVariant(null);
      return;
    }

    const variant = product.variants.find(v => v.id === parseInt(variantId));
    setSelectedVariant(variant);
    setQuantity(1); // Reset quantity when variant changes
  };

  // Check if variation is required but not selected
  const isVariationRequired = () => {
    return product?.hasVariants && product?.variants?.length > 0;
  };

  const isVariationSelected = () => {
    return selectedVariant !== null;
  };

  // Get current price based on selected variant or product
  const getCurrentPrice = () => {
    if (selectedVariant) {
      return parseFloat(selectedVariant.price);
    }
    // Show base price when no variant selected
    return parseFloat(product.price);
  };

  // Get original price (for members showing discount)
  const getOriginalPrice = () => {
    if (selectedVariant && selectedVariant.originalPrice) {
      return parseFloat(selectedVariant.originalPrice);
    }
    if (product.originalPrice) {
      return parseFloat(product.originalPrice);
    }
    return null;
  };

  // Get current stock based on selected variant or product
  const getCurrentStock = () => {
    if (selectedVariant) {
      return selectedVariant.stock;
    }
    return product.stock;
  };

  const handleQuantityChange = (delta) => {
    const currentStock = getCurrentStock();
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= currentStock) {
      setQuantity(newQuantity);
    }
  };

  const validateAndProceed = (callback) => {
    // Check if variation is required but not selected
    if (isVariationRequired() && !isVariationSelected()) {
      setVariationError('Please select a product variation');
      // Scroll to variant selector
      document.getElementById('variant-select')?.focus();
      return false;
    }
    setVariationError('');
    callback();
    return true;
  };

  const handleAddToCart = async () => {
    if (!validateAndProceed(async () => {
      setAdding(true);
      const result = await addToCart(product.id, quantity, selectedVariant?.id);
      setAdding(false);

      if (result.success) {
        alert('Added to cart!');
      } else {
        alert(result.error || 'Failed to add to cart');
      }
    })) return;
  };

  const handleBuyNow = async () => {
    if (!validateAndProceed(async () => {
      setAdding(true);
      const result = await addToCart(product.id, quantity, selectedVariant?.id);
      setAdding(false);

      if (result.success) {
        navigate('/cart');
      } else {
        alert(result.error || 'Failed to add to cart');
      }
    })) return;
  };

  if (loading) {
    return (
      <div className="loading" style={{ minHeight: '60vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '100px 0' }}>
        <h2>Product not found</h2>
        <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '20px' }}>
          Back to Shop
        </button>
      </div>
    );
  }

  const currentStock = getCurrentStock();
  const currentPrice = getCurrentPrice();
  const originalPrice = getOriginalPrice();
  const canAddToCart = !isVariationRequired() || isVariationSelected();

  const getStockStatus = () => {
    if (!isVariationSelected() && isVariationRequired()) {
      return { text: 'Select a variation to see stock', class: '' };
    }
    if (currentStock === 0) return { text: 'Out of Stock', class: 'out' };
    if (currentStock < 10) return { text: `Only ${currentStock} left!`, class: 'low' };
    return { text: 'In Stock', class: '' };
  };

  const stockStatus = getStockStatus();

  return (
    <section className="product-detail">
      <div className="container">
        <button
          onClick={() => navigate(-1)}
          className="btn btn-outline btn-sm"
          style={{ marginBottom: '30px' }}
        >
          ← Back
        </button>

        <div className="product-detail-grid">
          <div className="product-detail-gallery">
            <ImageGallery
              images={galleryImages}
              fallbackImage={getImageUrl(product.image_url)}
              isLoading={imagesLoading}
            />
          </div>

          <div className="product-detail-info">
            <span className="product-category">{product.category}</span>
            <div className="product-title-row">
              <h1>{product.name}</h1>
              <button
                className="wishlist-btn-detail"
                onClick={handleWishlistToggle}
                disabled={wishlistLoading}
                title={isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
              >
                {isWishlisted ? '♥' : '♡'}
              </button>
            </div>

            {/* Variant Selector */}
            {product.hasVariants && product.variants?.length > 0 && (
              <div className={`variant-selector ${variationError ? 'has-error' : ''}`}>
                <label htmlFor="variant-select">Select Option: <span className="required">*</span></label>
                <select
                  id="variant-select"
                  value={selectedVariant?.id || ''}
                  onChange={handleVariantChange}
                  className={`variant-dropdown ${variationError ? 'error' : ''}`}
                >
                  <option value="">-- Select Variation --</option>
                  {product.variants.map((variant) => (
                    <option key={variant.id} value={variant.id}>
                      {variant.variant_name} - RM {parseFloat(variant.price).toFixed(2)}
                      {variant.stock < 10 && variant.stock > 0 ? ` (${variant.stock} left)` : ''}
                      {variant.stock === 0 ? ' (Out of Stock)' : ''}
                    </option>
                  ))}
                </select>
                {variationError && (
                  <p className="variation-error">{variationError}</p>
                )}
              </div>
            )}

            {/* Price Display */}
            <div className="product-detail-price-wrapper">
              {isVariationSelected() || !isVariationRequired() ? (
                <>
                  <p className="product-detail-price">RM {currentPrice.toFixed(2)}</p>
                  {product.isMember && originalPrice && originalPrice > currentPrice && (
                    <>
                      <span className="product-detail-price-old">RM {originalPrice.toFixed(2)}</span>
                      <span className="member-badge">MEMBER PRICE</span>
                    </>
                  )}
                </>
              ) : (
                <p className="product-detail-price price-range">
                  From RM {parseFloat(product.price).toFixed(2)}
                </p>
              )}
            </div>

            {/* Member Price Message for Non-logged in users */}
            {!isAuthenticated && (
              <div className="member-price-hint">
                <Link to="/login">Login</Link> to unlock member prices!
              </div>
            )}

            <p className={`stock-info ${stockStatus.class}`}>{stockStatus.text}</p>

            <div
              className="product-detail-description"
              dangerouslySetInnerHTML={{ __html: (product.description || 'No description available.').replace(/\n/g, '<br>') }}
            />

            {(currentStock > 0 || !isVariationSelected()) && (
              <>
                <div className="quantity-selector">
                  <span>Quantity:</span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={quantity <= 1 || !canAddToCart}
                  >
                    -
                  </button>
                  <span className="quantity-value">{quantity}</span>
                  <button
                    className="quantity-btn"
                    onClick={() => handleQuantityChange(1)}
                    disabled={quantity >= currentStock || !canAddToCart}
                  >
                    +
                  </button>
                </div>

                <div className="product-actions">
                  <button
                    onClick={handleAddToCart}
                    className={`btn btn-outline btn-lg ${!canAddToCart ? 'btn-disabled' : ''}`}
                    disabled={adding || (isVariationSelected() && currentStock === 0)}
                  >
                    {adding ? 'Adding...' : 'Add to Cart'}
                  </button>
                  <button
                    onClick={handleBuyNow}
                    className={`btn btn-primary btn-lg ${!canAddToCart ? 'btn-disabled' : ''}`}
                    disabled={adding || (isVariationSelected() && currentStock === 0)}
                  >
                    Buy Now
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductDetail;
