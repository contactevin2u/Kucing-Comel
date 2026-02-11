import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';
import HeroCarousel from '../components/HeroCarousel';

// Main animal categories
const animalCategories = [
  { name: 'cat', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200', label: 'CATS' },
  { name: 'dog', image: 'https://as1.ftcdn.net/v2/jpg/00/88/34/58/1000_F_88345863_tdpJPVC3pY1L5US7skyHJVcLuRb7LNT5.jpg', label: 'DOGS', imageClass: 'custom-position' },
];

// Product type filters
const productFilters = [
  { name: 'Food', label: 'Food', route: 'food' },
  { name: 'Litter', label: 'Litter', route: 'litter' },
  { name: 'Supplements & Medications', label: 'Supplements', route: 'supplements' },
];

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [activePetType, setActivePetType] = useState('');
  const productsRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, [activeFilter, activePetType]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeFilter) {
        params.category = activeFilter;
      }
      if (activePetType) {
        params.petType = activePetType;
      }
      const data = await api.getProducts(params);
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalCategoryClick = (petType) => {
    if (activePetType === petType) {
      // Toggle off - show all
      setActivePetType('');
    } else {
      setActivePetType(petType);
    }

    setTimeout(() => {
      productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  };

  const handleFilterClick = (filterName) => {
    if (activeFilter === filterName) {
      setActiveFilter('');
    } else {
      setActiveFilter(filterName);
    }
  };

  const getPageTitle = () => {
    const petLabel = activePetType === 'cat' ? 'Cat' : activePetType === 'dog' ? 'Dog' : '';
    if (activeFilter) {
      const filterLabel = activeFilter === 'Supplements & Medications' ? 'Supplements' : activeFilter;
      return petLabel ? `${petLabel} ${filterLabel}` : filterLabel;
    }
    if (petLabel) {
      return `${petLabel} Products`;
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
                  className={`category-item ${activePetType === cat.name ? 'active' : ''}`}
                  onClick={() => handleAnimalCategoryClick(cat.name)}
                >
                  <div className="category-icon">
                    <img src={cat.image} alt={cat.name} className={cat.imageClass || ''} />
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
            {/* Member Benefits Card */}
            <div className="promo-card coral">
              <h3>Login to enjoy 10% OFF member price on all products</h3>
              <p className="promo-subtext">Exclusive member pricing available after login</p>
              <button onClick={() => navigate('/login')} className="btn btn-white btn-sm">LOGIN NOW</button>
            </div>

            {/* Free Shipping Card */}
            <div className="promo-card teal">
              <h3>Enjoy FREE shipping when you spend RM150 & above</h3>
              <p className="promo-subtext">Buy more, save more with free shipping</p>
              <button onClick={() => productsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} className="btn btn-white btn-sm">BUY NOW</button>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section" ref={productsRef}>
        <div className="container">
          <div className="products-header">
            <h2>{getPageTitle()}</h2>
            <a href="#" className="view-all" onClick={(e) => { e.preventDefault(); setActiveFilter(''); setActivePetType(''); }}>
              View All →
            </a>
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

          {/* Pet type sub-filters when a category is active */}
          {activeFilter && (
            <div className="product-filters" style={{ marginTop: '-15px' }}>
              <button
                className={`filter-btn ${!activePetType ? 'active' : ''}`}
                onClick={() => navigate(`/${productFilters.find(f => f.name === activeFilter)?.route}`)}
              >
                View All {activeFilter === 'Supplements & Medications' ? 'Supplements' : activeFilter}
              </button>
              <button
                className={`filter-btn ${activePetType === 'cat' ? 'active' : ''}`}
                onClick={() => navigate(`/${productFilters.find(f => f.name === activeFilter)?.route}/cat`)}
              >
                Cat {activeFilter === 'Supplements & Medications' ? 'Supplements' : activeFilter}
              </button>
              <button
                className={`filter-btn ${activePetType === 'dog' ? 'active' : ''}`}
                onClick={() => navigate(`/${productFilters.find(f => f.name === activeFilter)?.route}/dog`)}
              >
                Dog {activeFilter === 'Supplements & Medications' ? 'Supplements' : activeFilter}
              </button>
            </div>
          )}

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
    </div>
  );
};

export default Home;
