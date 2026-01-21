import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import ProductCard from '../components/ProductCard';

const categories = [
  { name: 'Food', image: 'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=200', label: 'FOOD' },
  { name: 'Toys', image: 'https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=200', label: 'TOYS' },
  { name: 'Beds', image: 'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=200', label: 'BEDS' },
  { name: 'Grooming', image: 'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6?w=200', label: 'GROOMING' },
  { name: 'Accessories', image: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200', label: 'ACCESSORIES' },
];

const Home = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

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
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-background">
          <div className="hero-bg-left"></div>
          <div className="hero-bg-right"></div>
          <div className="hero-bg-accent"></div>
        </div>
        <div className="container">
          <div className="hero-content">
            <h1>The Best Choice<br />For Your Cats</h1>
            <p>
              Discover premium products for your beloved feline friends.
              From nutritious food to fun toys, we have everything!
            </p>
            <Link to="/?category=Food" className="btn btn-white btn-lg">
              DISCOVER
            </Link>
          </div>
          <div className="hero-image">
            <div className="paw-decoration paw-1">🐾</div>
            <div className="paw-decoration paw-2">🐾</div>
            <img
              src="https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=500"
              alt="Cute cat"
              style={{ borderRadius: '20px', maxWidth: '400px' }}
            />
          </div>
        </div>
      </section>

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
          <div className="promo-grid">
            {/* Promo Card 1 */}
            <div className="promo-card teal">
              <div className="promo-discount">50%<sup>OFF</sup></div>
              <h3>Cat Toys</h3>
              <Link to="/?category=Toys" className="btn btn-white btn-sm">SHOP NOW</Link>
              <img
                src="https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=300"
                alt="Cat toys"
                className="promo-image"
              />
            </div>

            {/* Promo Card 2 */}
            <div className="promo-card yellow">
              <div className="promo-discount" style={{ fontSize: '2rem' }}>BUY 1<br /><span style={{ fontSize: '1.5rem' }}>GET 1</span></div>
              <h3>Cat Accessories</h3>
              <Link to="/?category=Accessories" className="btn btn-white btn-sm">SHOP NOW</Link>
              <img
                src="https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=300"
                alt="Cat accessories"
                className="promo-image"
              />
            </div>

            {/* Promo Card 3 */}
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
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="products-section">
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
              <span className="banner-label">New collection</span>
              <h3>Fun toys for cats</h3>
              <div className="banner-discount">NEW</div>
              <img
                src="https://images.unsplash.com/photo-1545249390-6bdfa286032f?w=250"
                alt="Cat toys"
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
