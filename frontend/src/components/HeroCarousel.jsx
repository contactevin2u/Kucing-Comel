import React, { useState, useEffect } from 'react';

// Import all images from carousel folder using require.context
const importAll = (r) => r.keys().map((key) => ({
  src: r(key),
  name: key.replace('./', '').replace(/\.[^/.]+$/, '') // Remove path and extension
}));

const images = importAll(require.context('../assets/carousel', false, /\.(png|jpe?g|svg|webp)$/));

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-slide every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="hero-carousel">
      {/* Slides */}
      <div className="carousel-container">
        {images.map((image, index) => (
          <div
            key={index}
            className={`carousel-slide ${index === currentSlide ? 'active' : ''}`}
            style={{
              opacity: index === currentSlide ? 1 : 0,
              transition: 'opacity 0.5s ease-in-out'
            }}
          >
            <img src={image.src} alt={image.name} />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button className="carousel-btn carousel-btn-prev" onClick={prevSlide}>
        ‹
      </button>
      <button className="carousel-btn carousel-btn-next" onClick={nextSlide}>
        ›
      </button>

      {/* Dots */}
      <div className="carousel-dots">
        {images.map((_, index) => (
          <button
            key={index}
            className={`carousel-dot ${index === currentSlide ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
