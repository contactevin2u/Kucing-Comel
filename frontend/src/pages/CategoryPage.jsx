import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';

// Static config for known categories (for backwards-compatible URLs)
const staticCategoryConfig = {
  food: { label: 'Food', dbValue: 'Food' },
  litter: { label: 'Litter', dbValue: 'Litter' },
  supplements: { label: 'Supplements', dbValue: 'Supplements & Medications' },
};

const petTypeLabels = {
  cat: 'Cat',
  dog: 'Dog',
};

const CategoryPage = () => {
  const { category, petType } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(staticCategoryConfig[category] || null);

  // For dynamic categories, resolve the DB value from the API
  useEffect(() => {
    if (staticCategoryConfig[category]) {
      setConfig(staticCategoryConfig[category]);
      return;
    }
    // Try to resolve dynamic category from API
    const resolveCategory = async () => {
      try {
        const data = await api.getCategories();
        if (data.categories) {
          const match = data.categories.find(c => {
            const route = c.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            return route === category;
          });
          if (match) {
            setConfig({ label: match, dbValue: match });
          }
        }
      } catch (error) {
        console.error('Failed to resolve category:', error);
      }
    };
    resolveCategory();
  }, [category]);

  useEffect(() => {
    if (!config) return;
    fetchProducts();
  }, [config, petType]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { category: config.dbValue };
      if (petType) {
        params.petType = petType;
      }
      const data = await api.getProducts(params);
      setProducts(data.products);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <section className="products-section">
        <div className="container" style={{ textAlign: 'center', padding: '60px 0' }}>
          <h2>Category not found</h2>
          <p style={{ color: '#636E72', marginTop: '10px' }}>
            <a href="/" style={{ color: '#00BFB3' }}>Back to Home</a>
          </p>
        </div>
      </section>
    );
  }

  const getTitle = () => {
    if (petType && petTypeLabels[petType]) {
      return `${petTypeLabels[petType]} ${config.label}`;
    }
    return `All ${config.label}`;
  };

  return (
    <section className="products-section">
      <div className="container">
        <div className="products-header">
          <h2>{getTitle()}</h2>
          <a
            href="/"
            className="view-all"
            onClick={(e) => { e.preventDefault(); navigate('/'); }}
          >
            Back to Home
          </a>
        </div>

        {/* Pet Type Filter Buttons */}
        <div className="product-filters">
          <button
            className={`filter-btn ${!petType ? 'active' : ''}`}
            onClick={() => navigate(`/${category}`)}
          >
            View All
          </button>
          <button
            className={`filter-btn ${petType === 'cat' ? 'active' : ''}`}
            onClick={() => navigate(`/${category}/cat`)}
          >
            Cat {config.label}
          </button>
          <button
            className={`filter-btn ${petType === 'dog' ? 'active' : ''}`}
            onClick={() => navigate(`/${category}/dog`)}
          >
            Dog {config.label}
          </button>
        </div>

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
  );
};

export default CategoryPage;
