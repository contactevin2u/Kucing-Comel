import React from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import TopBanner from './components/TopBanner';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Login from './pages/Login';
import Register from './pages/Register';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import Wishlist from './pages/Wishlist';
import OrderSuccess from './pages/OrderSuccess';
import MockPayment from './pages/MockPayment';

// Layout wrapper for pages with header/footer
const MainLayout = ({ children }) => (
  <div className="App">
    <TopBanner />
    <Navbar />
    <main style={{ minHeight: 'calc(100vh - 300px)' }}>
      {children}
    </main>
    <Footer />
  </div>
);

function App() {
  const location = useLocation();

  // Mock payment page has its own layout (simulates external payment page)
  if (location.pathname === '/mock-payment') {
    return <MockPayment />;
  }

  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/product/:id" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/order-success" element={<OrderSuccess />} />
      </Routes>
    </MainLayout>
  );
}

export default App;
