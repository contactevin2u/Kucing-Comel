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
  getShippingOrders,
  getOrderSpxData,
  updateOrderTracking,
  exportSpxExcel,
} = require('../controllers/adminController');
const {
  getAllVouchers,
  getVoucherById,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucherStatus,
} = require('../controllers/voucherController');

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
router.get('/orders/shipping', getShippingOrders);
router.get('/orders/export-spx', exportSpxExcel);
router.get('/orders/:id', getOrderById);
router.get('/orders/:id/spx-data', getOrderSpxData);
router.patch('/orders/:id/status', updateOrderStatus);
router.patch('/orders/:id/delivery-fee', updateOrderDeliveryFee);
router.patch('/orders/:id/tracking', updateOrderTracking);

// Customers
router.get('/customers', getAllCustomers);

// Configuration
router.get('/config/fees', getFeeConfig);

// Vouchers
router.get('/vouchers', getAllVouchers);
router.get('/vouchers/:id', getVoucherById);
router.post('/vouchers', createVoucher);
router.put('/vouchers/:id', updateVoucher);
router.delete('/vouchers/:id', deleteVoucher);
router.patch('/vouchers/:id/toggle', toggleVoucherStatus);

module.exports = router;
