const fs = require('fs');
const path = require('path');

// Map product slugs to their folder paths
const productFolderMap = {
  'care-fip': 'Care fip',
  'lilien-premium-super-clumping-cat-litter-6l': 'Lilien Premium Super Clumping Cat Litter 6L'
};

// Map variation types to folder names (simplified mapping)
// Variants like "20mg | 8.5ml", "20mg | 30ml" all map to "20mg Variation" folder
const getVariationFolder = (variantName) => {
  if (!variantName) return null;

  // Extract the mg value from variant name (e.g., "20mg | 8.5ml" -> "20mg")
  const mgMatch = variantName.match(/^(\d+mg)/i);
  if (mgMatch) {
    const mgValue = mgMatch[1].toLowerCase();
    // Map to folder names
    const folderMap = {
      '20mg': '20mg Variation',
      '30mg': '30mg Variation',
      '60mg': '60mg Variation'  // Tablet version
    };
    return folderMap[mgValue] || null;
  }

  // Handle litter scent variants
  const scentVariants = ['charcoal', 'fresh milk', 'lavender'];
  const lowerVariant = variantName.toLowerCase();
  if (scentVariants.includes(lowerVariant)) {
    // Return the folder name with proper casing
    const scentFolderMap = {
      'charcoal': 'Charcoal',
      'fresh milk': 'Fresh Milk',
      'lavender': 'Lavender'
    };
    return scentFolderMap[lowerVariant] || null;
  }

  return null;
};

// Get the base Products folder path
const getProductsBasePath = () => {
  return path.join(__dirname, '..', '..', '..', 'Products');
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
      `/api/product-images/${encodeURIComponent(productFolder)}/${encodeURIComponent(variantFolder)}/${encodeURIComponent(img)}`
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
        `/api/product-images/${encodeURIComponent(productFolder)}/Main/${encodeURIComponent(img)}`
      );
    } else if (fs.existsSync(mainLowerPath) && getImagesFromFolder(mainLowerPath).length > 0) {
      imageUrls = images.map(img =>
        `/api/product-images/${encodeURIComponent(productFolder)}/main/${encodeURIComponent(img)}`
      );
    } else {
      imageUrls = images.map(img =>
        `/api/product-images/${encodeURIComponent(productFolder)}/${encodeURIComponent(img)}`
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
