import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';
import HeroCarousel from '../components/HeroCarousel';

// Main animal categories
const animalCategories = [
  { name: 'Cats', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200', label: 'CATS' },
  { name: 'Dogs', image: 'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200', label: 'DOGS' },
];

// Product type filters
const productFilters = [
  { name: 'Food', label: 'Food' },
  { name: 'Litter', label: 'Litter' },
  { name: 'Supplements & Medications', label: 'Supplements' },
];

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const productsRef = useRef(null);

  const currentCategory = searchParams.get('category') || '';

  useEffect(() => {
    fetchProducts();
  }, [currentCategory, activeFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      // Use activeFilter for product type filtering
      if (activeFilter) {
        params.category = activeFilter;
      } else if (currentCategory) {
        params.category = currentCategory;
      }
      const data = await api.getProducts(params);
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalCategoryClick = (category) => {
    // For now, Cats shows all products, Dogs shows empty (no dog products yet)
    if (category === 'Cats') {
      searchParams.delete('category');
      setActiveFilter('');
    } else {
      searchParams.set('category', category);
      setActiveFilter('');
    }
    setSearchParams(searchParams);

    setTimeout(() => {
      productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleFilterClick = (filterName) => {
    // Toggle filter - if same filter clicked, clear it
    if (activeFilter === filterName) {
      setActiveFilter('');
    } else {
      setActiveFilter(filterName);
    }
    // Clear URL category when using filters
    searchParams.delete('category');
    setSearchParams(searchParams);
  };

  const getPageTitle = () => {
    if (activeFilter) {
      return activeFilter === 'Supplements & Medications' ? 'Supplements' : activeFilter;
    }
    if (currentCategory) {
      return currentCategory;
    }
    return 'All Products';
  };

  return (
    <div>
      {/* Hero Carousel */}
      <HeroCarousel />

      {/* Categories Section - Cats & Dogs */}
      <section className="categories-section">
        <div className="container">
          <h2 className="section-title">Shop by category</h2>
          <div className="categories-slider">
            <div className="categories-grid">
              {animalCategories.map((cat) => (
                <div
                  key={cat.name}
                  className={`category-item ${currentCategory === cat.name || (cat.name === 'Cats' && !currentCategory && !activeFilter) ? 'active' : ''}`}
                  onClick={() => handleAnimalCategoryClick(cat.name)}
                >
                  <div className="category-icon">
                    <img src={cat.image} alt={cat.name} />
                  </div>
                  <span>{cat.label}</span>
                </div>
              ))}
            </div>
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
              <button onClick={() => handleFilterClick('Food')} className="btn btn-white btn-sm">SHOP NOW</button>
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
              <button onClick={() => handleFilterClick('Litter')} className="btn btn-white btn-sm">SHOP NOW</button>
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
            <h2>{getPageTitle()}</h2>
            <Link to="/" className="view-all" onClick={() => setActiveFilter('')}>
              View All →
            </Link>
          </div>

          {/* Product Type Filters */}
          <div className="product-filters">
            {productFilters.map((filter) => (
              <button
                key={filter.name}
                className={`filter-btn ${activeFilter === filter.name ? 'active' : ''}`}
                onClick={() => handleFilterClick(filter.name)}
              >
                {filter.label}
              </button>
            ))}
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
