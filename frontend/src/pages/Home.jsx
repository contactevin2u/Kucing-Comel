import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const currentCategory = searchParams.get('category') || '';

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentCategory]);

  const fetchCategories = async () => {
    try {
      const data = await api.getCategories();
      setCategories(data.categories);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (currentCategory) params.category = currentCategory;
      if (search) params.search = search;

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
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <h1>Welcome to Kucing Comel 🐱</h1>
          <p>
            Discover the best products for your beloved cats. From premium food
            to fun toys, we have everything your feline friend needs!
          </p>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px', justifyContent: 'center', maxWidth: '500px', margin: '0 auto' }}>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '12px 20px',
                borderRadius: '25px',
                border: 'none',
                fontSize: '1rem'
              }}
            />
            <button type="submit" className="btn btn-secondary">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Categories */}
      <div className="container">
        <div className="categories">
          <button
            className={`category-btn ${!currentCategory ? 'active' : ''}`}
            onClick={() => handleCategoryClick('')}
          >
            All Products
          </button>
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${currentCategory === category ? 'active' : ''}`}
              onClick={() => handleCategoryClick(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <section className="products-section">
        <div className="container">
          <h2 className="section-title">
            {currentCategory || 'All Products'}
          </h2>

          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
            </div>
          ) : products.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#95A5A6' }}>
              <h3>No products found</h3>
              <p>Try a different search or category</p>
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
