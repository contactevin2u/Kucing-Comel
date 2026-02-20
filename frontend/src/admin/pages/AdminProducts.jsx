import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getImageUrl = (product) => {
  if (!product) return null;
  // Multi-image: use primary image from product_images table
  if (product.primary_image_id) {
    return `${API_URL}/api/product-images/db/${product.primary_image_id}`;
  }
  // Legacy DB-stored image
  if (product.has_db_image) {
    return `${API_URL}/api/product-images/db/product/${product.id}`;
  }
  const url = product.image_url;
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}/api/product-images${encodeURI(url)}`;
};

const getDbImageUrl = (imageId) => `${API_URL}/api/product-images/db/${imageId}`;

const AdminProducts = () => {
  const { adminFetch } = useAdminAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [petTypeFilter, setPetTypeFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [variants, setVariants] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    member_price: '',
    image_url: '',
    category: '',
    pet_type: 'cat',
    stock: '',
    weight: '',
    is_active: true
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Multi-image state
  const [productImages, setProductImages] = useState([]); // {id, image_mime, sort_order} from DB
  const [pendingImages, setPendingImages] = useState([]); // {file, preview, base64, mime} for new product
  const [showManualUrl, setShowManualUrl] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef(null);

  // Variant form state
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantForm, setVariantForm] = useState({
    variant_name: '',
    price: '',
    member_price: '',
    stock: '',
    is_active: true
  });

  const refreshRef = useRef(null);

  const refreshProducts = useCallback(async () => {
    try {
      const response = await adminFetch(`${API_URL}/api/admin/products`);
      if (!response.ok) return;
      const data = await response.json();
      setProducts(data.products);
    } catch {
      // Silently ignore — next poll will retry
    }
  }, [adminFetch]);

  refreshRef.current = refreshProducts;

  useEffect(() => {
    // Initial load with spinner
    const loadInitial = async () => {
      try {
        setLoading(true);
        const response = await adminFetch(`${API_URL}/api/admin/products`);
        if (!response.ok) throw new Error('Failed to fetch products');
        const data = await response.json();
        setProducts(data.products);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadInitial();

    // Auto-refresh every 5 seconds so all users see changes
    const interval = setInterval(() => {
      refreshRef.current?.();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cats = [...new Set(products.map(p => p.category).filter(Boolean))];
    setCategories(cats.sort());
  }, [products]);

  const fetchProductDetail = async (id) => {
    try {
      const response = await adminFetch(`${API_URL}/api/admin/products/${id}`);

      if (!response.ok) throw new Error('Failed to fetch product details');

      const data = await response.json();
      setVariants(data.variants || []);
      setProductImages(data.images || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      description: '',
      price: '',
      member_price: '',
      image_url: '',
      category: '',
      pet_type: 'cat',
      stock: '0',
      weight: '',
      is_active: true
    });
    setProductImages([]);
    setPendingImages([]);
    setShowManualUrl(false);
    setShowNewCategory(false);
    setVariants([]);
    setShowVariantForm(false);
    setEditingVariant(null);
    setFormError('');
    setShowModal(true);
  };

  const openEditModal = async (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      member_price: product.member_price || '',
      image_url: product.image_url || '',
      category: product.category || '',
      pet_type: product.pet_type || 'cat',
      stock: product.stock,
      weight: product.weight || '',
      is_active: product.is_active
    });
    setPendingImages([]);
    setShowManualUrl(!!(product.image_url && !product.has_db_image && parseInt(product.image_count) === 0));
    setShowNewCategory(false);
    setShowVariantForm(false);
    setEditingVariant(null);
    setFormError('');
    setShowModal(true);
    await fetchProductDetail(product.id);
  };

  const handleImageFiles = (files) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        setFormError('Only JPEG, PNG, GIF, and WebP images are allowed.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        setFormError('Each image must be smaller than 2MB.');
        return;
      }
    }

    setFormError('');

    for (const file of files) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1];
        if (editingProduct) {
          // Upload immediately when editing an existing product
          uploadImage(editingProduct.id, base64, file.type);
        } else {
          // Queue for new product
          setPendingImages(prev => [...prev, {
            file,
            preview: reader.result,
            base64,
            mime: file.type
          }]);
        }
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadImage = async (productId, base64, mime) => {
    setImageUploading(true);
    try {
      const response = await adminFetch(`${API_URL}/api/admin/products/${productId}/images`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image_data: base64, image_mime: mime })
      });
      if (!response.ok) throw new Error('Failed to upload image');
      await fetchProductDetail(productId);
      refreshProducts();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteImage = async (imageId) => {
    if (!editingProduct) return;
    try {
      const response = await adminFetch(
        `${API_URL}/api/admin/products/${editingProduct.id}/images/${imageId}`,
        { method: 'DELETE' }
      );
      if (!response.ok) throw new Error('Failed to delete image');
      await fetchProductDetail(editingProduct.id);
      refreshProducts();
    } catch (err) {
      setFormError(err.message);
    }
  };

  const removePendingImage = (index) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleImageDragStart = (index) => {
    setDragIndex(index);
  };

  const handleImageDragOver = (e, index) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    if (editingProduct) {
      // Reorder DB images
      const reordered = [...productImages];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(index, 0, moved);
      setProductImages(reordered);
    } else {
      // Reorder pending images
      const reordered = [...pendingImages];
      const [moved] = reordered.splice(dragIndex, 1);
      reordered.splice(index, 0, moved);
      setPendingImages(reordered);
    }
    setDragIndex(index);
  };

  const handleImageDragEnd = async () => {
    if (editingProduct && dragIndex !== null) {
      // Save reorder to backend
      const imageIds = productImages.map(img => img.id);
      try {
        await adminFetch(`${API_URL}/api/admin/products/${editingProduct.id}/images/reorder`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ imageIds })
        });
        refreshProducts();
      } catch (err) {
        setFormError('Failed to reorder images');
      }
    }
    setDragIndex(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const url = editingProduct
        ? `${API_URL}/api/admin/products/${editingProduct.id}`
        : `${API_URL}/api/admin/products`;

      const method = editingProduct ? 'PUT' : 'POST';

      const payload = {
        name: formData.name,
        description: formData.description || null,
        price: parseFloat(formData.price),
        member_price: formData.member_price ? parseFloat(formData.member_price) : null,
        image_url: formData.image_url || null,
        category: formData.category || null,
        pet_type: formData.pet_type || null,
        stock: parseInt(formData.stock) || 0,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        is_active: formData.is_active
      };

      const response = await adminFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      // For new products, upload pending images
      if (!editingProduct && pendingImages.length > 0) {
        const newProductId = data.product.id;
        for (const img of pendingImages) {
          await adminFetch(`${API_URL}/api/admin/products/${newProductId}/images`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image_data: img.base64, image_mime: img.mime })
          });
        }
      }

      setShowModal(false);
      refreshProducts();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (product) => {
    try {
      const response = await adminFetch(`${API_URL}/api/admin/products/${product.id}/toggle`, {
        method: 'PATCH',
      });

      if (!response.ok) throw new Error('Failed to toggle product status');

      refreshProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteProduct = async (product) => {
    if (!window.confirm(`Are you sure you want to delete "${product.name}"?`)) {
      return;
    }

    try {
      const response = await adminFetch(`${API_URL}/api/admin/products/${product.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete product');

      refreshProducts();
    } catch (err) {
      setError(err.message);
    }
  };

  // Variant CRUD
  const openVariantForm = (variant = null) => {
    setEditingVariant(variant);
    setVariantForm(variant ? {
      variant_name: variant.variant_name,
      price: variant.price,
      member_price: variant.member_price || '',
      stock: variant.stock,
      is_active: variant.is_active
    } : {
      variant_name: '',
      price: '',
      member_price: '',
      stock: '0',
      is_active: true
    });
    setShowVariantForm(true);
  };

  const handleVariantSubmit = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      const url = editingVariant
        ? `${API_URL}/api/admin/products/${editingProduct.id}/variants/${editingVariant.id}`
        : `${API_URL}/api/admin/products/${editingProduct.id}/variants`;

      const method = editingVariant ? 'PUT' : 'POST';

      const payload = {
        variant_name: variantForm.variant_name,
        price: parseFloat(variantForm.price),
        member_price: variantForm.member_price ? parseFloat(variantForm.member_price) : null,
        stock: parseInt(variantForm.stock) || 0,
        is_active: variantForm.is_active
      };

      const response = await adminFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save variant');

      setShowVariantForm(false);
      setEditingVariant(null);
      await fetchProductDetail(editingProduct.id);
    } catch (err) {
      setFormError(err.message);
    }
  };

  const deleteVariant = async (variant) => {
    if (!editingProduct) return;
    if (!window.confirm(`Delete variant "${variant.variant_name}"?`)) return;

    try {
      const response = await adminFetch(
        `${API_URL}/api/admin/products/${editingProduct.id}/variants/${variant.id}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) throw new Error('Failed to delete variant');

      await fetchProductDetail(editingProduct.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCloseAsDraft = async () => {
    // If form has enough data to save, save as draft (inactive)
    if (formData.name && formData.price) {
      try {
        const url = editingProduct
          ? `${API_URL}/api/admin/products/${editingProduct.id}`
          : `${API_URL}/api/admin/products`;

        const method = editingProduct ? 'PUT' : 'POST';

        const payload = {
          name: formData.name,
          description: formData.description || null,
          price: parseFloat(formData.price),
          member_price: formData.member_price ? parseFloat(formData.member_price) : null,
          image_url: formData.image_url || null,
          category: formData.category || null,
          pet_type: formData.pet_type || null,
          stock: parseInt(formData.stock) || 0,
          weight: formData.weight ? parseFloat(formData.weight) : null,
          is_active: false
        };

        const response = await adminFetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
          // For new products, upload pending images
          if (!editingProduct && pendingImages.length > 0) {
            const newProductId = data.product.id;
            for (const img of pendingImages) {
              await adminFetch(`${API_URL}/api/admin/products/${newProductId}/images`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image_data: img.base64, image_mime: img.mime })
              });
            }
          }
          refreshProducts();
        }
      } catch {
        // Silently fail — close modal anyway
      }
    }
    setShowModal(false);
  };

  const filteredProducts = products.filter(p => {
    if (categoryFilter && p.category !== categoryFilter) return false;
    if (petTypeFilter && p.pet_type !== petTypeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="admin-spinner"></div>
        <p>Loading products...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Products</h1>
        <button className="btn-primary" onClick={openCreateModal}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Add Product
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--admin-border)',
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '14px'
          }}
        >
          <option value="">All Categories ({products.length})</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat} ({products.filter(p => p.category === cat).length})
            </option>
          ))}
        </select>

        <select
          value={petTypeFilter}
          onChange={(e) => setPetTypeFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--admin-border)',
            background: '#ffffff',
            color: '#0f172a',
            fontSize: '14px'
          }}
        >
          <option value="">All Pet Types</option>
          <option value="cat">Cat ({products.filter(p => p.pet_type === 'cat').length})</option>
          <option value="dog">Dog ({products.filter(p => p.pet_type === 'dog').length})</option>
          <option value="both">Both ({products.filter(p => p.pet_type === 'both').length})</option>
        </select>
      </div>

      <div className="admin-card">
        {filteredProducts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#1e293b' }}>
            <p>No products found.</p>
            <p>Click "Add Product" to create your first product.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Pet Type</th>
                  <th>Price</th>
                  <th>Member Price</th>
                  <th>Stock</th>
                  <th>Images</th>
                  <th>Variants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{product.category || '-'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{product.pet_type || '-'}</td>
                    <td>RM {parseFloat(product.price).toFixed(2)}</td>
                    <td>
                      {product.member_price
                        ? `RM ${parseFloat(product.member_price).toFixed(2)}`
                        : '-'}
                    </td>
                    <td>
                      <span style={{
                        color: parseInt(product.stock) < 5 ? '#dc2626' : 'inherit',
                        fontWeight: parseInt(product.stock) < 5 ? '600' : 'normal'
                      }}>
                        {product.stock}
                      </span>
                    </td>
                    <td>{product.image_count || 0}</td>
                    <td>{product.variant_count || 0}</td>
                    <td>
                      {product.is_active ? (
                        <span className="status-badge status-active">Active</span>
                      ) : (
                        <span className="status-badge status-inactive">Inactive</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className="btn-icon"
                          onClick={() => openEditModal(product)}
                          title="Edit"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => toggleStatus(product)}
                          title={product.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {product.is_active ? (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          ) : (
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                              <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          )}
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => deleteProduct(product)}
                          title="Delete"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                            <polyline points="3,6 5,6 21,6" />
                            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Product Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseAsDraft}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Create Product'}</h2>
              <button className="modal-close" onClick={handleCloseAsDraft}>&times;</button>
            </div>

            <form onSubmit={handleSubmit}>
              {formError && <div className="alert alert-error">{formError}</div>}

              <div className="form-group">
                <label htmlFor="prod-name">Product Name *</label>
                <input
                  type="text"
                  id="prod-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Premium Cat Food"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="prod-desc">Description</label>
                <textarea
                  id="prod-desc"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description..."
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: '#ffffff',
                    color: '#0f172a',
                    resize: 'vertical',
                    fontFamily: 'inherit'
                  }}
                />
                {formData.description && /\*[^*]+\*/.test(formData.description) && (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 12px',
                    background: '#f8fafc',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    fontSize: '14px',
                    color: '#0f172a',
                    lineHeight: '1.5'
                  }}>
                    <span style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '4px' }}>Preview:</span>
                    <span dangerouslySetInnerHTML={{ __html: formData.description.replace(/\*([^*]+)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>') }} />
                  </div>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="prod-price">Price (RM) *</label>
                  <input
                    type="number"
                    id="prod-price"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="prod-member-price">Member Price (RM)</label>
                  <input
                    type="number"
                    id="prod-member-price"
                    value={formData.member_price}
                    onChange={(e) => setFormData({ ...formData, member_price: e.target.value })}
                    placeholder="Optional"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Product Images {imageUploading && <span style={{ color: '#6366f1', fontSize: '12px' }}>(uploading...)</span>}</label>

                {/* Existing images (DB) */}
                {productImages.length > 0 && (
                  <div className="multi-image-list">
                    {productImages.map((img, index) => (
                      <div
                        key={img.id}
                        className={`multi-image-item ${dragIndex === index ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => handleImageDragStart(index)}
                        onDragOver={(e) => handleImageDragOver(e, index)}
                        onDragEnd={handleImageDragEnd}
                      >
                        <div className="multi-image-grip" title="Drag to reorder">⠿</div>
                        <img src={getDbImageUrl(img.id)} alt={`Image ${index + 1}`} />
                        {index === 0 && <span className="multi-image-primary">Primary</span>}
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={() => handleDeleteImage(img.id)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending images (for new product) */}
                {!editingProduct && pendingImages.length > 0 && (
                  <div className="multi-image-list">
                    {pendingImages.map((img, index) => (
                      <div
                        key={index}
                        className={`multi-image-item ${dragIndex === index ? 'dragging' : ''}`}
                        draggable
                        onDragStart={() => handleImageDragStart(index)}
                        onDragOver={(e) => handleImageDragOver(e, index)}
                        onDragEnd={() => setDragIndex(null)}
                      >
                        <div className="multi-image-grip" title="Drag to reorder">⠿</div>
                        <img src={img.preview} alt={`Pending ${index + 1}`} />
                        {index === 0 && <span className="multi-image-primary">Primary</span>}
                        <button
                          type="button"
                          className="upload-remove"
                          onClick={() => removePendingImage(index)}
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload Zone - add more images */}
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) handleImageFiles(files);
                  }}
                >
                  <div className="upload-placeholder">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="32" height="32">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17,8 12,3 7,8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span>Click or drag images here</span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>JPEG, PNG, GIF, WebP (max 2MB each) — First image = primary</span>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    multiple
                    style={{ display: 'none' }}
                    onChange={(e) => handleImageFiles(Array.from(e.target.files))}
                  />
                </div>

                {/* Manual URL toggle */}
                {productImages.length === 0 && pendingImages.length === 0 && (
                  <>
                    <button
                      type="button"
                      style={{
                        background: 'none', border: 'none', color: '#6366f1',
                        fontSize: '12px', cursor: 'pointer', padding: '6px 0', marginTop: '4px'
                      }}
                      onClick={() => setShowManualUrl(!showManualUrl)}
                    >
                      {showManualUrl ? 'Hide URL input' : 'Or enter image URL manually'}
                    </button>
                    {showManualUrl && (
                      <input
                        type="text"
                        id="prod-image"
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="/path/to/image.jpg or https://..."
                        style={{ marginTop: '6px' }}
                      />
                    )}
                  </>
                )}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="prod-category">Category</label>
                  {showNewCategory ? (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        id="prod-category"
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        placeholder="New category name"
                        autoFocus
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        style={{
                          background: 'none', border: '1px solid var(--admin-border)',
                          borderRadius: '6px', padding: '0 10px', cursor: 'pointer',
                          color: '#64748b', fontSize: '13px'
                        }}
                        onClick={() => setShowNewCategory(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <select
                      id="prod-category"
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setFormData({ ...formData, category: '' });
                          setShowNewCategory(true);
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="__new__">+ Add New Category...</option>
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="prod-pet-type">Pet Type</label>
                  <select
                    id="prod-pet-type"
                    value={formData.pet_type}
                    onChange={(e) => setFormData({ ...formData, pet_type: e.target.value })}
                  >
                    <option value="cat">Cat</option>
                    <option value="dog">Dog</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="prod-weight">Weight (kg)</label>
                <input
                  type="number"
                  id="prod-weight"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  placeholder="Optional"
                  min="0"
                  step="0.01"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="prod-stock">Stock *</label>
                  <input
                    type="number"
                    id="prod-stock"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    />
                    Active
                  </label>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingProduct ? 'Update Product' : 'Create Product')}
                </button>
              </div>
            </form>

            {/* Variants Section - only when editing */}
            {editingProduct && (
              <div style={{ marginTop: '24px', borderTop: '1px solid var(--admin-border)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Variants</h3>
                  <button
                    type="button"
                    className="btn-primary"
                    style={{ padding: '6px 12px', fontSize: '13px' }}
                    onClick={() => openVariantForm()}
                  >
                    + Add Variant
                  </button>
                </div>

                {variants.length === 0 && !showVariantForm && (
                  <p style={{ color: '#475569', fontSize: '14px' }}>
                    No variants. Add variants for different sizes, flavors, etc.
                  </p>
                )}

                {variants.map(variant => (
                  <div key={variant.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    border: '1px solid var(--admin-border)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    background: variant.is_active ? 'transparent' : 'var(--admin-bg)',
                    opacity: variant.is_active ? 1 : 0.6
                  }}>
                    <div>
                      <strong style={{ fontSize: '14px' }}>{variant.variant_name}</strong>
                      <div style={{ fontSize: '12px', color: '#334155', marginTop: '2px' }}>
                        RM {parseFloat(variant.price).toFixed(2)}
                        {variant.member_price && ` / Member: RM ${parseFloat(variant.member_price).toFixed(2)}`}
                        {' | '}
                        <span style={{
                          color: parseInt(variant.stock) < 5 ? '#dc2626' : 'inherit',
                          fontWeight: parseInt(variant.stock) < 5 ? '600' : 'normal'
                        }}>
                          Stock: {variant.stock}
                        </span>
                        {!variant.is_active && ' | Inactive'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn-icon"
                        onClick={() => openVariantForm(variant)}
                        title="Edit variant"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="btn-icon btn-danger"
                        onClick={() => deleteVariant(variant)}
                        title="Delete variant"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                          <polyline points="3,6 5,6 21,6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add/Edit Variant Form */}
                {showVariantForm && (
                  <form onSubmit={handleVariantSubmit} style={{
                    padding: '12px',
                    border: '1px solid var(--admin-primary)',
                    borderRadius: '6px',
                    marginTop: '8px',
                    background: '#f8fafc'
                  }}>
                    <div className="form-group" style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '13px' }}>Variant Name *</label>
                      <input
                        type="text"
                        value={variantForm.variant_name}
                        onChange={(e) => setVariantForm({ ...variantForm, variant_name: e.target.value })}
                        placeholder="e.g., 1kg, Chicken Flavor"
                        required
                        style={{ padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>

                    <div className="form-row" style={{ gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '13px' }}>Price (RM) *</label>
                        <input
                          type="number"
                          value={variantForm.price}
                          onChange={(e) => setVariantForm({ ...variantForm, price: e.target.value })}
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          required
                          style={{ padding: '8px 10px', fontSize: '13px' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '13px' }}>Member Price (RM)</label>
                        <input
                          type="number"
                          value={variantForm.member_price}
                          onChange={(e) => setVariantForm({ ...variantForm, member_price: e.target.value })}
                          placeholder="Optional"
                          min="0"
                          step="0.01"
                          style={{ padding: '8px 10px', fontSize: '13px' }}
                        />
                      </div>
                    </div>

                    <div className="form-row" style={{ gap: '10px' }}>
                      <div className="form-group" style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '13px' }}>Stock *</label>
                        <input
                          type="number"
                          value={variantForm.stock}
                          onChange={(e) => setVariantForm({ ...variantForm, stock: e.target.value })}
                          placeholder="0"
                          min="0"
                          required
                          style={{ padding: '8px 10px', fontSize: '13px' }}
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: '10px', display: 'flex', alignItems: 'flex-end', paddingBottom: '4px' }}>
                        <label className="checkbox-label" style={{ fontSize: '13px' }}>
                          <input
                            type="checkbox"
                            checked={variantForm.is_active}
                            onChange={(e) => setVariantForm({ ...variantForm, is_active: e.target.checked })}
                          />
                          Active
                        </label>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                        onClick={() => { setShowVariantForm(false); setEditingVariant(null); }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="btn-primary"
                        style={{ padding: '6px 12px', fontSize: '13px' }}
                      >
                        {editingVariant ? 'Update Variant' : 'Add Variant'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .btn-primary {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--admin-primary);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-primary:hover {
          background: var(--admin-primary-hover);
        }

        .btn-primary:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: var(--admin-bg);
          color: var(--admin-text);
          border: 1px solid var(--admin-border);
          padding: 10px 20px;
          border-radius: 8px;
          cursor: pointer;
        }

        .btn-icon {
          background: transparent;
          border: 1px solid var(--admin-border);
          padding: 6px;
          border-radius: 6px;
          cursor: pointer;
          color: #334155;
        }

        .btn-icon:hover {
          background: var(--admin-bg);
          color: var(--admin-text);
        }

        .btn-icon.btn-danger:hover {
          background: #fee2e2;
          color: #dc2626;
          border-color: #dc2626;
        }

        .table-container {
          overflow-x: auto;
        }

        .admin-table {
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
        }

        .admin-table th,
        .admin-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid var(--admin-border);
          color: #0f172a;
        }

        .admin-table th {
          font-weight: 600;
          color: #0f172a;
          font-size: 12px;
          text-transform: uppercase;
          background: #ffffff;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-active {
          background: #dcfce7;
          color: #16a34a;
        }

        .status-inactive {
          background: #f3f4f6;
          color: #374151;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: #ffffff;
          border-radius: 12px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          color: #0f172a;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #1e293b;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 14px;
          color: #0f172a;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid var(--admin-border);
          border-radius: 6px;
          font-size: 14px;
          background: #ffffff;
          color: #0f172a;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--admin-primary);
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .checkbox-label input {
          width: auto;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 24px;
          padding-top: 16px;
          border-top: 1px solid var(--admin-border);
        }

        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 16px;
        }

        .alert-error {
          background: #fee2e2;
          color: #dc2626;
          border: 1px solid #fecaca;
        }

        .upload-zone {
          border: 2px dashed var(--admin-border);
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: border-color 0.2s, background 0.2s;
          background: #fafbfc;
        }

        .upload-zone:hover,
        .upload-zone.drag-over {
          border-color: var(--admin-primary);
          background: #f0f0ff;
        }

        .upload-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 13px;
        }

        .upload-preview {
          position: relative;
          display: inline-block;
        }

        .upload-preview img {
          max-height: 140px;
          max-width: 100%;
          border-radius: 6px;
          object-fit: contain;
        }

        .upload-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #dc2626;
          color: white;
          border: 2px solid white;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .multi-image-list {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 10px;
        }

        .multi-image-item {
          position: relative;
          width: 90px;
          height: 90px;
          border: 1px solid var(--admin-border);
          border-radius: 8px;
          overflow: visible;
          cursor: grab;
          transition: opacity 0.2s, box-shadow 0.2s;
        }

        .multi-image-item:active {
          cursor: grabbing;
        }

        .multi-image-item.dragging {
          opacity: 0.5;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }

        .multi-image-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 7px;
        }

        .multi-image-grip {
          position: absolute;
          bottom: 2px;
          left: 2px;
          background: rgba(0,0,0,0.5);
          color: white;
          font-size: 10px;
          padding: 1px 4px;
          border-radius: 3px;
          line-height: 1;
          cursor: grab;
        }

        .multi-image-primary {
          position: absolute;
          top: 2px;
          left: 2px;
          background: #6366f1;
          color: white;
          font-size: 9px;
          padding: 2px 5px;
          border-radius: 3px;
          font-weight: 600;
          text-transform: uppercase;
        }
      `}</style>
    </div>
  );
};

export default AdminProducts;
