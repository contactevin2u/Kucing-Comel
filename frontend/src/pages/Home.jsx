import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';
import HeroCarousel from '../components/HeroCarousel';

const categories = [
  { name: 'Food', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=200', label: 'FOOD' },
  { name: 'Litter', image: 'https://images.unsplash.com/photo-1574158622682-e40e69881006?w=200', label: 'LITTER' },
];

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const productsRef = useRef(null);

  const currentCategory = searchParams.get('category') || '';

  useEffect(() => {
    fetchProducts();
  }, [currentCategory]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentCategory) params.category = currentCategory;
      const data = await api.getProducts(params);
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    if (category === currentCategory) {
      searchParams.delete('category');
    } else {
      searchParams.set('category', category);
    }
    setSearchParams(searchParams);

    setTimeout(() => {
      productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Categories Section */}
      <section className="categories-section">
        <div className="container">
          <h2 className="section-title">Shop by category</h2>
          <div className="categories-slider">
            <button className="slider-btn">‹</button>
            <div className="categories-grid">
              {categories.map((cat) => (
                <div
                  key={cat.name}
                  className={`category-item ${currentCategory === cat.name ? 'active' : ''}`}
                  onClick={() => handleCategoryClick(cat.name)}
                >
                  <div className="category-icon">
                    <img src={cat.image} alt={cat.name} />
                  </div>
                  <span>{cat.label}</span>
                </div>
              ))}
            </div>
            <button className="slider-btn">›</button>
          </div>
        </div>
      </section>

      {/* Promo Cards Section */}
      <section className="promo-section" id="promo">
        <div className="container">
          <div className="promo-grid promo-grid-2">
            <div className="promo-card coral">
              <div className="promo-discount">30%<sup>OFF</sup></div>
              <h3>Cat Food</h3>
              <Link to="/?category=Food" className="btn btn-white btn-sm">SHOP NOW</Link>
              <img
                src="https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=300"
                alt="Cat food"
                className="promo-image"
              />
            </div>

            {/* Promo Card - Cat Litter */}
            <div className="promo-card teal">
              <div className="promo-discount">NEW</div>
              <h3>Cat Litter</h3>
              <Link to="/?category=Litter" className="btn btn-white btn-sm">SHOP NOW</Link>
              <img
                src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=300"
                alt="Cat litter"
                className="promo-image"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section" ref={productsRef}>
        <div className="container">
          <div className="products-header">
            <h2>{currentCategory || 'All Products'}</h2>
            <Link to="/" className="view-all">
              View All →
            </Link>
          </div>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#636E72' }}>
              <h3>No products found</h3>
              <p>Try a different category</p>
            </div>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Banner Section */}
      <section className="banner-section">
        <div className="container">
          <div className="banner-grid">
            <div className="banner-card yellow">
              <span className="banner-label">Premium quality</span>
              <h3>Cat Litter</h3>
              <div className="banner-discount">NEW</div>
              <img
                src="https://images.unsplash.com/photo-1574158622682-e40e69881006?w=250"
                alt="Cat litter"
                className="banner-image"
              />
            </div>
            <div className="banner-card pink">
              <span className="banner-label">Best sellers</span>
              <h3>Delicious treats</h3>
              <div className="banner-discount">50%</div>
              <img
                src="https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=250"
                alt="Cat treats"
                className="banner-image"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
