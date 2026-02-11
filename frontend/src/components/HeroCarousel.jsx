import React, { useState, useEffect, useRef, useCallback } from 'react';

// Import all images from carousel folder using require.context
const importAll = (r) => r.keys().map((key) => ({
  src: r(key),
  name: key.replace('./', '').replace(/\.[^/.]+$/, '') // Remove path and extension
}));

const images = importAll(require.context('../assets/carousel', false, /\.(png|jpe?g|svg|webp)$/));

const HeroCarousel = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const intervalRef = useRef(null);

  const resetAutoSlide = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % images.length);
    }, 4000);
  }, []);

  // Auto-slide every 4 seconds
  useEffect(() => {
    resetAutoSlide();
    return () => clearInterval(intervalRef.current);
  }, [resetAutoSlide]);

  const goToSlide = (index) => {
    setCurrentSlide(index);
    resetAutoSlide();
  };

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % images.length);
    resetAutoSlide();
  }, [resetAutoSlide]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + images.length) % images.length);
    resetAutoSlide();
  }, [resetAutoSlide]);

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        nextSlide();
      } else {
        prevSlide();
      }
    }
  };

  const handleSlideClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width / 2) {
      prevSlide();
    } else {
      nextSlide();
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div
      className="hero-carousel"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slides */}
      <div className="carousel-container" onClick={handleSlideClick} style={{ cursor: 'pointer' }}>
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
