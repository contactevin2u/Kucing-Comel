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

// Map category names to URL-friendly routes and short labels
const getCategoryRoute = (name) => {
  const lower = name.toLowerCase();
  if (lower === 'food') return 'food';
  if (lower === 'litter') return 'litter';
  if (lower.includes('supplement')) return 'supplements';
  return lower.replace(/[^a-z0-9]+/g, '-');
};

const getCategoryLabel = (name) => {
  if (name === 'Supplements & Medications') return 'Supplements';
  return name;
};

const Home = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('');
  const [activePetType, setActivePetType] = useState('');
  const [productFilters, setProductFilters] = useState([]);
  const productsRef = useRef(null);
  const categoriesRef = useRef(null);
  const navigate = useNavigate();

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await api.getCategories();
        if (data.categories) {
          setProductFilters(data.categories.map(name => ({
            name,
            label: getCategoryLabel(name),
            route: getCategoryRoute(name),
          })));
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };
    fetchCategories();
  }, []);

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
      const el = categoriesRef.current;
      if (el) {
        const y = el.getBoundingClientRect().top + window.scrollY - 65;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
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
      const filterLabel = getCategoryLabel(activeFilter);
      return petLabel ? `${petLabel} ${filterLabel}` : filterLabel;
    }
    if (petLabel) {
      return `${petLabel} Products`;
    }
    return 'All Products';
  };

  return (
    <div>
      {/* Hero Area - fits viewport on desktop */}
      <div className="hero-area">
      {/* Hero Carousel */}
      <HeroCarousel />

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

      {/* Categories Section - Cats & Dogs */}
      <section className="categories-section" ref={categoriesRef}>
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
      </div>

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
          {activeFilter && (() => {
            const activeRoute = productFilters.find(f => f.name === activeFilter)?.route;
            const activeLabel = getCategoryLabel(activeFilter);
            return (
              <div className="product-filters" style={{ marginTop: '-15px' }}>
                <button
                  className={`filter-btn ${!activePetType ? 'active' : ''}`}
                  onClick={() => navigate(`/${activeRoute}`)}
                >
                  View All {activeLabel}
                </button>
                <button
                  className={`filter-btn ${activePetType === 'cat' ? 'active' : ''}`}
                  onClick={() => navigate(`/${activeRoute}/cat`)}
                >
                  Cat {activeLabel}
                </button>
                <button
                  className={`filter-btn ${activePetType === 'dog' ? 'active' : ''}`}
                  onClick={() => navigate(`/${activeRoute}/dog`)}
                >
                  Dog {activeLabel}
                </button>
              </div>
            );
          })()}

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#636E72' }}>
              <h3>Coming soon!</h3>
              <p>Check out our other products in the meantime.</p>
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
