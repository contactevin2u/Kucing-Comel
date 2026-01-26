import React, { useState, useEffect } from 'react';

const ImageGallery = ({ images, fallbackImage, isLoading: externalLoading }) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [imageLoading, setImageLoading] = useState(false);

  // Reset to first image when images array changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [images]);

  // Get the current images to display
  const displayImages = images && images.length > 0 ? images : (fallbackImage ? [fallbackImage] : []);
  const currentImage = displayImages[selectedIndex] || fallbackImage;

  const handleThumbnailClick = (index) => {
    if (index !== selectedIndex) {
      setImageLoading(true);
      setSelectedIndex(index);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = (e) => {
    setImageLoading(false);
    e.target.src = 'https://via.placeholder.com/500x400?text=Image+Not+Found';
  };

  const isLoading = externalLoading || imageLoading;

  if (displayImages.length === 0 && !fallbackImage) {
    return (
      <div className="image-gallery">
        <div className="gallery-main">
          <img
            src="https://via.placeholder.com/500x400?text=No+Image"
            alt="No image available"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="image-gallery">
      <div className="gallery-main">
        {isLoading && (
          <div className="gallery-loading">
            <div className="spinner"></div>
          </div>
        )}
        <img
          src={currentImage}
          alt="Product"
          onLoad={handleImageLoad}
          onError={handleImageError}
          className={isLoading ? 'loading' : ''}
        />
      </div>
      {displayImages.length > 1 && (
        <div className="gallery-thumbnails">
          {displayImages.map((image, index) => (
            <button
              key={index}
              className={`gallery-thumbnail ${index === selectedIndex ? 'active' : ''}`}
              onClick={() => handleThumbnailClick(index)}
              type="button"
              aria-label={`View image ${index + 1}`}
            >
              <img
                src={image}
                alt={`Thumbnail ${index + 1}`}
                onError={(e) => {
                  e.target.src = 'https://via.placeholder.com/100x100?text=?';
                }}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageGallery;
