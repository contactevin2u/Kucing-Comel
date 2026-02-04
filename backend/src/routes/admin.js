const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');
const {
  getDashboardSummary,
  getDailyStats,
  getWeeklyStats,
  getMonthlyStats,
  getYearlyStats,
  getMonthDetail,
  getYearDetail,
  getAvailablePeriods,
  getDrilldownData,
  getAllOrders,
  getOrderById,
  updateOrderStatus,
  updateOrderDeliveryFee,
  getFeeConfig,
  getAllCustomers,
  exportOrders,
} = require('../controllers/adminController');

// All admin routes require admin authentication
router.use(adminAuth);

// Dashboard
router.get('/dashboard', getDashboardSummary);
router.get('/dashboard/drilldown', getDrilldownData);
router.get('/stats/daily', getDailyStats);
router.get('/stats/weekly', getWeeklyStats);
router.get('/stats/monthly', getMonthlyStats);
router.get('/stats/yearly', getYearlyStats);
router.get('/stats/month-detail', getMonthDetail);
router.get('/stats/year-detail', getYearDetail);
router.get('/stats/available-periods', getAvailablePeriods);

// Orders
router.get('/orders', getAllOrders);
router.get('/orders/export', exportOrders);
router.get('/orders/:id', getOrderById);
router.patch('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/delivery-fee', updateOrderDeliveryFee);

// Customers
router.get('/customers', getAllCustomers);

// Configuration
router.get('/config/fees', getFeeConfig);

module.exports = router;
