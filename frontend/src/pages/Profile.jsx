import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { User, MapPin, Lock, Plus, Trash2, Check, Edit2, X, Mail, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();

  // Personal Info State
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [personalLoading, setPersonalLoading] = useState(false);
  const [personalMessage, setPersonalMessage] = useState({ type: '', text: '' });

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    recipient_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'Malaysia',
    is_default: false
  });
  const [addressMessage, setAddressMessage] = useState({ type: '', text: '' });
  const [addressSaving, setAddressSaving] = useState(false);

  // Password State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Email Change State
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailForm, setEmailForm] = useState({
    newEmail: '',
    password: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState({ type: '', text: '' });

  // Password Visibility State
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
    emailConfirm: false
  });

  // Malaysian states for dropdown
  const malaysianStates = [
    'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan',
    'Pahang', 'Perak', 'Perlis', 'Pulau Pinang', 'Sabah',
    'Sarawak', 'Selangor', 'Terengganu', 'Kuala Lumpur', 'Labuan', 'Putrajaya'
  ];

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (user) {
      setPersonalInfo({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || ''
      });
    }
    fetchAddresses();
  }, [isAuthenticated, user, navigate]);

  const fetchAddresses = async () => {
    try {
      const data = await api.getAddresses();
      setAddresses(data.addresses);
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setAddressesLoading(false);
    }
  };

  // Personal Info Handlers
  const handlePersonalSubmit = async (e) => {
    e.preventDefault();
    setPersonalLoading(true);
    setPersonalMessage({ type: '', text: '' });

    try {
      const data = await api.updateProfile({
        name: personalInfo.name,
        phone: personalInfo.phone
      });
      updateUser(data.user);
      setPersonalMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditingPersonal(false);
    } catch (error) {
      setPersonalMessage({ type: 'error', text: error.message });
    } finally {
      setPersonalLoading(false);
    }
  };

  // Address Handlers
  const resetAddressForm = () => {
    setAddressForm({
      label: 'Home',
      recipient_name: user?.name || '',
      phone: user?.phone || '',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'Malaysia',
      is_default: addresses.length === 0
    });
  };

  const handleAddAddress = () => {
    resetAddressForm();
    setEditingAddress(null);
    setShowAddressForm(true);
    setAddressMessage({ type: '', text: '' });
  };

  const handleEditAddress = (address) => {
    setAddressForm({
      label: address.label || 'Home',
      recipient_name: address.recipient_name,
      phone: address.phone,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country || 'Malaysia',
      is_default: address.is_default
    });
    setEditingAddress(address.id);
    setShowAddressForm(true);
    setAddressMessage({ type: '', text: '' });
  };

  const handleAddressSubmit = async (e) => {
    e.preventDefault();
    setAddressSaving(true);
    setAddressMessage({ type: '', text: '' });

    try {
      if (editingAddress) {
        await api.updateAddress(editingAddress, addressForm);
        setAddressMessage({ type: 'success', text: 'Address updated successfully!' });
      } else {
        await api.addAddress(addressForm);
        setAddressMessage({ type: 'success', text: 'Address added successfully!' });
      }
      await fetchAddresses();
      setShowAddressForm(false);
      setEditingAddress(null);
    } catch (error) {
      setAddressMessage({ type: 'error', text: error.message });
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Are you sure you want to delete this address?')) return;

    try {
      await api.deleteAddress(id);
      await fetchAddresses();
      setAddressMessage({ type: 'success', text: 'Address deleted successfully!' });
    } catch (error) {
      setAddressMessage({ type: 'error', text: error.message });
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await api.setDefaultAddress(id);
      await fetchAddresses();
      setAddressMessage({ type: 'success', text: 'Default address updated!' });
    } catch (error) {
      setAddressMessage({ type: 'error', text: error.message });
    }
  };

  // Password Handlers
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: '', text: '' });

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'New password must be at least 6 characters.' });
      return;
    }

    setPasswordLoading(true);

    try {
      await api.changePassword(null, passwordForm.newPassword);
      setPasswordMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      setPasswordMessage({ type: 'error', text: error.message });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Email Change Handlers
  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailMessage({ type: '', text: '' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailForm.newEmail)) {
      setEmailMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setEmailLoading(true);

    try {
      const data = await api.changeEmail(emailForm.password, emailForm.newEmail);
      updateUser(data.user);
      setPersonalInfo({ ...personalInfo, email: data.user.email });
      setEmailMessage({ type: 'success', text: 'Email changed successfully!' });
      setEmailForm({ newEmail: '', password: '' });
      setShowEmailForm(false);
    } catch (error) {
      setEmailMessage({ type: 'error', text: error.message });
    } finally {
      setEmailLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="profile-page">
      <div className="container">
        <h1>My Account</h1>

        {/* Account ID */}
        <div className="profile-section">
          <div className="profile-section-header">
            <User size={20} />
            <h2>Account Information</h2>
          </div>
          <div className="account-id">
            <span className="account-id-label">Account ID:</span>
            <span className="account-id-value">#{user?.id?.toString().padStart(6, '0')}</span>
          </div>
        </div>

        {/* Personal Info Section */}
        <div className="profile-section">
          <div className="profile-section-header">
            <User size={20} />
            <h2>Personal Information</h2>
            {!editingPersonal && (
              <button className="btn-edit" onClick={() => setEditingPersonal(true)}>
                <Edit2 size={16} /> Edit
              </button>
            )}
          </div>

          {personalMessage.text && (
            <div className={`profile-message ${personalMessage.type}`}>
              {personalMessage.text}
            </div>
          )}

          {editingPersonal ? (
            <form onSubmit={handlePersonalSubmit} className="profile-form">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  value={personalInfo.name}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Email Address</label>
                <div className="email-display-row">
                  <input
                    type="email"
                    value={personalInfo.email}
                    disabled
                    className="input-disabled"
                  />
                  <button
                    type="button"
                    className="btn-change-email"
                    onClick={() => {
                      setShowEmailForm(true);
                      setEmailForm({ newEmail: '', password: '' });
                      setEmailMessage({ type: '', text: '' });
                    }}
                  >
                    Change
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => setPersonalInfo({ ...personalInfo, phone: e.target.value })}
                  placeholder="e.g., 0123456789"
                />
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => {
                  setEditingPersonal(false);
                  setPersonalInfo({
                    name: user?.name || '',
                    email: user?.email || '',
                    phone: user?.phone || ''
                  });
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={personalLoading}>
                  {personalLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="profile-info-display">
              <div className="info-row">
                <span className="info-label">Name:</span>
                <span className="info-value">{user?.name || '-'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Email:</span>
                <span className="info-value">{user?.email || '-'}</span>
                <button
                  className="btn-change-email-inline"
                  onClick={() => {
                    setShowEmailForm(true);
                    setEmailForm({ newEmail: '', password: '' });
                    setEmailMessage({ type: '', text: '' });
                  }}
                >
                  Change
                </button>
              </div>
              <div className="info-row">
                <span className="info-label">Phone:</span>
                <span className="info-value">{user?.phone || '-'}</span>
              </div>
            </div>
          )}

          {/* Email Change Modal/Form */}
          {showEmailForm && (
            <div className="email-change-overlay">
              <div className="email-change-modal">
                <div className="email-change-header">
                  <Mail size={20} />
                  <h3>Change Email Address</h3>
                  <button
                    className="btn-close"
                    onClick={() => {
                      setShowEmailForm(false);
                      setEmailForm({ newEmail: '', password: '' });
                      setEmailMessage({ type: '', text: '' });
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {emailMessage.text && (
                  <div className={`profile-message ${emailMessage.type}`}>
                    {emailMessage.text}
                  </div>
                )}

                <form onSubmit={handleEmailSubmit} className="email-change-form">
                  <div className="form-group">
                    <label>Current Email</label>
                    <input
                      type="email"
                      value={user?.email || ''}
                      disabled
                      className="input-disabled"
                    />
                  </div>
                  <div className="form-group">
                    <label>New Email Address</label>
                    <input
                      type="email"
                      value={emailForm.newEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, newEmail: e.target.value })}
                      placeholder="Enter new email address"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Confirm with Password</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showPasswords.emailConfirm ? 'text' : 'password'}
                        value={emailForm.password}
                        onChange={(e) => setEmailForm({ ...emailForm, password: e.target.value })}
                        placeholder="Enter your current password"
                        required
                      />
                      <button
                        type="button"
                        className="password-toggle"
                        onClick={() => setShowPasswords({ ...showPasswords, emailConfirm: !showPasswords.emailConfirm })}
                        tabIndex={-1}
                      >
                        {showPasswords.emailConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <small>For security, please enter your password to confirm this change</small>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setShowEmailForm(false);
                        setEmailForm({ newEmail: '', password: '' });
                        setEmailMessage({ type: '', text: '' });
                      }}
                    >
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={emailLoading}>
                      {emailLoading ? 'Updating...' : 'Update Email'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Addresses Section */}
        <div className="profile-section">
          <div className="profile-section-header">
            <MapPin size={20} />
            <h2>Shipping Addresses</h2>
            <button className="btn-add" onClick={handleAddAddress}>
              <Plus size={16} /> Add Address
            </button>
          </div>

          {addressMessage.text && (
            <div className={`profile-message ${addressMessage.type}`}>
              {addressMessage.text}
            </div>
          )}

          {showAddressForm && (
            <form onSubmit={handleAddressSubmit} className="address-form">
              <h3>{editingAddress ? 'Edit Address' : 'Add New Address'}</h3>

              <div className="form-row">
                <div className="form-group">
                  <label>Label</label>
                  <select
                    value={addressForm.label}
                    onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                  >
                    <option value="Home">Home</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Recipient Name *</label>
                  <input
                    type="text"
                    value={addressForm.recipient_name}
                    onChange={(e) => setAddressForm({ ...addressForm, recipient_name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Address Line 1 *</label>
                <input
                  type="text"
                  value={addressForm.address_line1}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                  placeholder="Street address, house number"
                  required
                />
              </div>

              <div className="form-group">
                <label>Address Line 2</label>
                <input
                  type="text"
                  value={addressForm.address_line2}
                  onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                  placeholder="Apartment, unit, floor (optional)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>State *</label>
                  <select
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    required
                  >
                    <option value="">Select State</option>
                    {malaysianStates.map(state => (
                      <option key={state} value={state}>{state}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Postal Code *</label>
                  <input
                    type="text"
                    value={addressForm.postal_code}
                    onChange={(e) => setAddressForm({ ...addressForm, postal_code: e.target.value })}
                    required
                    maxLength={5}
                  />
                </div>
                <div className="form-group">
                  <label>Country</label>
                  <input
                    type="text"
                    value={addressForm.country}
                    disabled
                    className="input-disabled"
                  />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={addressForm.is_default}
                    onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                  />
                  Set as default address
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={() => {
                  setShowAddressForm(false);
                  setEditingAddress(null);
                }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addressSaving}>
                  {addressSaving ? 'Saving...' : (editingAddress ? 'Update Address' : 'Add Address')}
                </button>
              </div>
            </form>
          )}

          {addressesLoading ? (
            <div className="loading-inline">Loading addresses...</div>
          ) : addresses.length === 0 ? (
            <div className="no-addresses">
              <p>You haven't added any addresses yet.</p>
            </div>
          ) : (
            <div className="addresses-list">
              {addresses.map((address) => (
                <div key={address.id} className={`address-card ${address.is_default ? 'default' : ''}`}>
                  <div className="address-card-header">
                    <span className="address-label">{address.label}</span>
                    {address.is_default && (
                      <span className="default-badge">Default</span>
                    )}
                  </div>
                  <div className="address-card-body">
                    <p className="recipient">{address.recipient_name}</p>
                    <p>{address.phone}</p>
                    <p>{address.address_line1}</p>
                    {address.address_line2 && <p>{address.address_line2}</p>}
                    <p>{address.city}, {address.state} {address.postal_code}</p>
                    <p>{address.country}</p>
                  </div>
                  <div className="address-card-actions">
                    {!address.is_default && (
                      <button
                        className="btn-icon"
                        onClick={() => handleSetDefault(address.id)}
                        title="Set as default"
                      >
                        <Check size={16} /> Set Default
                      </button>
                    )}
                    <button
                      className="btn-icon"
                      onClick={() => handleEditAddress(address)}
                      title="Edit"
                    >
                      <Edit2 size={16} /> Edit
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={() => handleDeleteAddress(address.id)}
                      title="Delete"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Change Password Section */}
        <div id="password-section" className="profile-section">
          <div className="profile-section-header">
            <Lock size={20} />
            <h2>Change Password</h2>
          </div>

          {passwordMessage.text && (
            <div className={`profile-message ${passwordMessage.type}`}>
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="profile-form password-form">
            <div className="form-group">
              <label>New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                  tabIndex={-1}
                >
                  {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small>Minimum 6 characters</small>
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                  tabIndex={-1}
                >
                  {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;
