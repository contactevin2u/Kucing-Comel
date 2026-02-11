import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAdminAuth } from '../AdminApp';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}/api/product-images${encodeURI(url)}`;
};

const AdminProducts = () => {
  const { getToken } = useAdminAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
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
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) return;
      const data = await response.json();
      setProducts(data.products);
    } catch {
      // Silently ignore — next poll will retry
    }
  }, [getToken]);

  refreshRef.current = refreshProducts;

  useEffect(() => {
    // Initial load with spinner
    const loadInitial = async () => {
      try {
        setLoading(true);
        const token = getToken();
        const response = await fetch(`${API_URL}/api/admin/products`, {
          headers: { Authorization: `Bearer ${token}` }
        });
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
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch product details');

      const data = await response.json();
      setVariants(data.variants || []);
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
    setShowVariantForm(false);
    setEditingVariant(null);
    setFormError('');
    setShowModal(true);
    await fetchProductDetail(product.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);

    try {
      const token = getToken();
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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save product');
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
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/products/${product.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
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
      const token = getToken();
      const response = await fetch(`${API_URL}/api/admin/products/${product.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
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
      const token = getToken();
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

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
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
      const token = getToken();
      const response = await fetch(
        `${API_URL}/api/admin/products/${editingProduct.id}/variants/${variant.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!response.ok) throw new Error('Failed to delete variant');

      await fetchProductDetail(editingProduct.id);
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredProducts = categoryFilter
    ? products.filter(p => p.category === categoryFilter)
    : products;

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

      {/* Category filter */}
      {categories.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
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
        </div>
      )}

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
                  <th>Variants</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {product.image_url && (
                          <img
                            src={getImageUrl(product.image_url)}
                            alt={product.name}
                            style={{
                              width: '40px',
                              height: '40px',
                              objectFit: 'cover',
                              borderRadius: '6px',
                              border: '1px solid var(--admin-border)'
                            }}
                          />
                        )}
                        <strong>{product.name}</strong>
                      </div>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>{editingProduct ? 'Edit Product' : 'Create Product'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
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
                <label htmlFor="prod-image">Image URL</label>
                <input
                  type="text"
                  id="prod-image"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="prod-category">Category</label>
                  <input
                    type="text"
                    id="prod-category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Cat Food"
                    list="category-suggestions"
                  />
                  <datalist id="category-suggestions">
                    {categories.map(cat => (
                      <option key={cat} value={cat} />
                    ))}
                  </datalist>
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
      `}</style>
    </div>
  );
};

export default AdminProducts;
