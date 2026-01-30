const fs = require('fs');
const path = require('path');

// Map product slugs to their folder paths (parent/scent for standalone litter products)
const productFolderMap = {
  'litter-6l-charcoal': 'Lilien Premium Super Clumping Cat Litter 6L/Charcoal',
  'litter-6l-fresh-milk': 'Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk',
  'litter-6l-lavender': 'Lilien Premium Super Clumping Cat Litter 6L/Lavender',
  'carton-litter-6l-charcoal': '[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Charcoal',
  'carton-litter-6l-fresh-milk': '[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Fresh Milk',
  'carton-litter-6l-lavender': '[1 CARTON] Lilien Premium Super Clumping Cat Litter 6L/Lavender',
};

// Map variation types to folder names
const getVariationFolder = (variantName) => {
  return null;
};

// Get the base Products folder path
const getProductsBasePath = () => {
  return path.join(__dirname, '..', '..', '..', 'Products');
};

// Encode a folder path preserving slashes
const encodeFolderPath = (folderPath) => {
  return folderPath.split('/').map(s => encodeURIComponent(s)).join('/');
};

// Get images from a folder dynamically (no hardcoded filenames)
const getImagesFromFolder = (folderPath) => {
  try {
    if (!fs.existsSync(folderPath)) {
      return [];
    }

    const files = fs.readdirSync(folderPath);
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.jfif'];

    return files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return imageExtensions.includes(ext);
      })
      .sort() // Sort alphabetically for consistent order
      .map(file => file);
  } catch (error) {
    console.error('Error reading folder:', error);
    return [];
  }
};

// Get variant images for a product
const getVariantImages = async (req, res) => {
  try {
    const { productSlug, variantName } = req.params;

    // Get the product folder name
    const productFolder = productFolderMap[productSlug];
    if (!productFolder) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Decode the variant name (it may be URL encoded)
    const decodedVariantName = decodeURIComponent(variantName);

    // Get the variation folder name
    const variantFolder = getVariationFolder(decodedVariantName);
    if (!variantFolder) {
      // Return main images if variant folder not found
      return getMainImages(req, res);
    }

    // Build the full path to the variant folder
    const variantPath = path.join(getProductsBasePath(), productFolder, variantFolder);

    // Get images from the variant folder dynamically
    const images = getImagesFromFolder(variantPath);

    if (images.length === 0) {
      // Fall back to main images if no variant images found
      return getMainImages(req, res);
    }

    // Build URLs for the images
    const imageUrls = images.map(img =>
      `/api/product-images/${encodeFolderPath(productFolder)}/${encodeURIComponent(variantFolder)}/${encodeURIComponent(img)}`
    );

    res.json({ images: imageUrls });
  } catch (error) {
    console.error('Error getting variant images:', error);
    res.status(500).json({ error: 'Failed to get variant images' });
  }
};

// Get main product images (default/fallback)
const getMainImages = async (req, res) => {
  try {
    const { productSlug } = req.params;

    // Get the product folder name
    const productFolder = productFolderMap[productSlug];
    if (!productFolder) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // First try the Main folder (capital M for litter products)
    let mainFolderPath = path.join(getProductsBasePath(), productFolder, 'Main');
    let images = getImagesFromFolder(mainFolderPath);

    // If Main folder is empty, try lowercase 'main' (for other products)
    if (images.length === 0) {
      mainFolderPath = path.join(getProductsBasePath(), productFolder, 'main');
      images = getImagesFromFolder(mainFolderPath);
    }

    // If main folder is empty or doesn't exist, try root folder
    if (images.length === 0) {
      const productPath = path.join(getProductsBasePath(), productFolder);
      images = getImagesFromFolder(productPath);
    }

    // Build URLs for the images - detect which folder was used
    let imageUrls;
    const mainCapitalPath = path.join(getProductsBasePath(), productFolder, 'Main');
    const mainLowerPath = path.join(getProductsBasePath(), productFolder, 'main');

    if (fs.existsSync(mainCapitalPath) && getImagesFromFolder(mainCapitalPath).length > 0) {
      imageUrls = images.map(img =>
        `/api/product-images/${encodeFolderPath(productFolder)}/Main/${encodeURIComponent(img)}`
      );
    } else if (fs.existsSync(mainLowerPath) && getImagesFromFolder(mainLowerPath).length > 0) {
      imageUrls = images.map(img =>
        `/api/product-images/${encodeFolderPath(productFolder)}/main/${encodeURIComponent(img)}`
      );
    } else {
      imageUrls = images.map(img =>
        `/api/product-images/${encodeFolderPath(productFolder)}/${encodeURIComponent(img)}`
      );
    }

    res.json({ images: imageUrls });
  } catch (error) {
    console.error('Error getting main images:', error);
    res.status(500).json({ error: 'Failed to get main images' });
  }
};

// Get available variations for a product
const getVariations = async (req, res) => {
  try {
    const { productSlug } = req.params;

    // Get the product folder name
    const productFolder = productFolderMap[productSlug];
    if (!productFolder) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const productPath = path.join(getProductsBasePath(), productFolder);

    // Read directories to find variations
    const entries = fs.readdirSync(productPath, { withFileTypes: true });
    const variations = entries
      .filter(entry => entry.isDirectory() && entry.name !== 'main')
      .map(entry => {
        // Extract mg value from folder name
        const match = entry.name.match(/^(\d+mg)/i);
        return {
          folder: entry.name,
          value: match ? match[1].toLowerCase() : entry.name,
          label: entry.name.replace(' Variation', '')
        };
      })
      .sort((a, b) => {
        // Sort by mg value numerically
        const aNum = parseInt(a.value) || 0;
        const bNum = parseInt(b.value) || 0;
        return aNum - bNum;
      });

    res.json({ variations });
  } catch (error) {
    console.error('Error getting variations:', error);
    res.status(500).json({ error: 'Failed to get variations' });
  }
};

// Validate variation selection (used by cart/checkout)
const validateVariation = (variantName) => {
  if (!variantName || variantName === '' || variantName === 'Select Variation') {
    return { valid: false, error: 'Please select a product variation' };
  }

  // Check if it's a valid variation
  const variantFolder = getVariationFolder(variantName);
  if (!variantFolder) {
    return { valid: false, error: 'Invalid variation selected' };
  }

  return { valid: true };
};

module.exports = {
  getVariantImages,
  getMainImages,
  getVariations,
  validateVariation
};
