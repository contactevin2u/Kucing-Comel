const db = require('../config/database');
const {
  calculateOrderFinancials,
  DEFAULT_DELIVERY_FEE,
  SENANGPAY_FEES,
} = require('../config/fees');

// Check if we're using PostgreSQL or SQLite
const isPostgres = db.isProduction;

/**
 * Get dashboard summary statistics with period comparisons
 */
const getDashboardSummary = async (req, res, next) => {
  try {
    // Get total counts
    const summaryResult = await db.query(`
      SELECT
        COUNT(*) as total_orders,
        COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
        COUNT(CASE WHEN status = 'shipped' THEN 1 END) as shipped_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders
      FROM orders
    `);

    const summary = summaryResult.rows[0];

    // Calculate all financial totals using the same function for consistency
    // This ensures dashboard totals match drill-down totals exactly
    const paidOrdersResult = await db.query(`
      SELECT total_amount, delivery_fee, payment_method
      FROM orders
      WHERE payment_status = 'paid'
    `);

    let totalRevenue = 0;      // What customers paid (product + delivery)
    let totalSenangPayFees = 0;
    let totalNetEarnings = 0;
    let totalDeliveryFees = 0;

    for (const order of paidOrdersResult.rows) {
      const financials = calculateOrderFinancials(order);
      totalRevenue += financials.orderTotal;        // Product + delivery
      totalDeliveryFees += financials.deliveryFee;
      totalSenangPayFees += financials.senangPayFee;
      totalNetEarnings += financials.netEarnings;   // Revenue - fees
    }

    // ===== TODAY vs YESTERDAY =====
    const todayQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE DATE(created_at) = CURRENT_DATE`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE DATE(created_at) = DATE('now')`;

    const yesterdayQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE DATE(created_at) = CURRENT_DATE - INTERVAL '1 day'`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE DATE(created_at) = DATE('now', '-1 day')`;

    const todayResult = await db.query(todayQuery);
    const yesterdayResult = await db.query(yesterdayQuery);

    // ===== THIS WEEK vs LAST WEEK =====
    const thisWeekQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE created_at >= datetime('now', '-7 days')`;

    const lastWeekQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days'`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE created_at >= datetime('now', '-14 days') AND created_at < datetime('now', '-7 days')`;

    const thisWeekResult = await db.query(thisWeekQuery);
    const lastWeekResult = await db.query(lastWeekQuery);

    // ===== THIS MONTH vs LAST MONTH =====
    const thisMonthQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`;

    const lastMonthQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue
         FROM orders
         WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now', '-1 month')`;

    const thisMonthResult = await db.query(thisMonthQuery);
    const lastMonthResult = await db.query(lastMonthQuery);

    // Helper function to calculate percentage change
    const calcChange = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };

    const today = {
      orders: parseInt(todayResult.rows[0].orders),
      revenue: Math.round(parseFloat(todayResult.rows[0].revenue) * 100) / 100,
    };
    const yesterday = {
      orders: parseInt(yesterdayResult.rows[0].orders),
      revenue: Math.round(parseFloat(yesterdayResult.rows[0].revenue) * 100) / 100,
    };
    const thisWeek = {
      orders: parseInt(thisWeekResult.rows[0].orders),
      revenue: Math.round(parseFloat(thisWeekResult.rows[0].revenue) * 100) / 100,
    };
    const lastWeek = {
      orders: parseInt(lastWeekResult.rows[0].orders),
      revenue: Math.round(parseFloat(lastWeekResult.rows[0].revenue) * 100) / 100,
    };
    const thisMonth = {
      orders: parseInt(thisMonthResult.rows[0].orders),
      revenue: Math.round(parseFloat(thisMonthResult.rows[0].revenue) * 100) / 100,
    };
    const lastMonth = {
      orders: parseInt(lastMonthResult.rows[0].orders),
      revenue: Math.round(parseFloat(lastMonthResult.rows[0].revenue) * 100) / 100,
    };

    res.json({
      summary: {
        totalOrders: parseInt(summary.total_orders),
        paidOrders: parseInt(summary.paid_orders),
        pendingOrders: parseInt(summary.pending_orders),
        shippedOrders: parseInt(summary.shipped_orders),
        deliveredOrders: parseInt(summary.delivered_orders),
        totalRevenue: Math.round(totalRevenue * 100) / 100,           // Product + delivery
        totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
        totalSenangPayFees: Math.round(totalSenangPayFees * 100) / 100,
        totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,   // Revenue - fees
      },
      today: {
        ...today,
        ordersChange: calcChange(today.orders, yesterday.orders),
        revenueChange: calcChange(today.revenue, yesterday.revenue),
      },
      yesterday,
      thisWeek: {
        ...thisWeek,
        ordersChange: calcChange(thisWeek.orders, lastWeek.orders),
        revenueChange: calcChange(thisWeek.revenue, lastWeek.revenue),
      },
      lastWeek,
      thisMonth: {
        ...thisMonth,
        ordersChange: calcChange(thisMonth.orders, lastMonth.orders),
        revenueChange: calcChange(thisMonth.revenue, lastMonth.revenue),
      },
      lastMonth,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get daily revenue breakdown for the last N days
 */
const getDailyStats = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 30;

    const query = isPostgres
      ? `SELECT
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= CURRENT_DATE - INTERVAL '${days} days'
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      : `SELECT
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= datetime('now', '-${days} days')
         GROUP BY DATE(created_at)
         ORDER BY date DESC`;

    const result = await db.query(query);

    res.json({
      dailyStats: result.rows.map(row => ({
        date: row.date,
        orders: parseInt(row.orders),
        paidOrders: parseInt(row.paid_orders),
        revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get monthly revenue breakdown
 */
const getMonthlyStats = async (req, res, next) => {
  try {
    const months = parseInt(req.query.months) || 12;

    const query = isPostgres
      ? `SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '${months} months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month DESC`
      : `SELECT
          strftime('%Y-%m-01', created_at) as month,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= datetime('now', '-${months} months')
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY month DESC`;

    const result = await db.query(query);

    res.json({
      monthlyStats: result.rows.map(row => ({
        month: row.month,
        orders: parseInt(row.orders),
        paidOrders: parseInt(row.paid_orders),
        revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get weekly revenue breakdown
 */
const getWeeklyStats = async (req, res, next) => {
  try {
    const weeks = parseInt(req.query.weeks) || 12;

    const query = isPostgres
      ? `SELECT
          DATE_TRUNC('week', created_at) as week,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '${weeks} weeks'
         GROUP BY DATE_TRUNC('week', created_at)
         ORDER BY week DESC`
      : `SELECT
          date(created_at, 'weekday 0', '-6 days') as week,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= datetime('now', '-${weeks * 7} days')
         GROUP BY date(created_at, 'weekday 0', '-6 days')
         ORDER BY week DESC`;

    const result = await db.query(query);

    res.json({
      weeklyStats: result.rows.map(row => ({
        week: row.week,
        orders: parseInt(row.orders),
        paidOrders: parseInt(row.paid_orders),
        revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get yearly revenue breakdown
 */
const getYearlyStats = async (req, res, next) => {
  try {
    const years = parseInt(req.query.years) || 5;

    const query = isPostgres
      ? `SELECT
          DATE_TRUNC('year', created_at) as year,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= DATE_TRUNC('year', CURRENT_DATE) - INTERVAL '${years} years'
         GROUP BY DATE_TRUNC('year', created_at)
         ORDER BY year DESC`
      : `SELECT
          strftime('%Y-01-01', created_at) as year,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE created_at >= datetime('now', '-${years} years')
         GROUP BY strftime('%Y', created_at)
         ORDER BY year DESC`;

    const result = await db.query(query);

    res.json({
      yearlyStats: result.rows.map(row => ({
        year: row.year,
        orders: parseInt(row.orders),
        paidOrders: parseInt(row.paid_orders),
        revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stats for a specific month (daily breakdown)
 */
const getMonthDetail = async (req, res, next) => {
  try {
    const { year, month } = req.query;

    if (!year || !month) {
      return res.status(400).json({ error: 'Year and month are required' });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;

    const query = isPostgres
      ? `SELECT
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)
         GROUP BY DATE(created_at)
         ORDER BY date DESC`
      : `SELECT
          DATE(created_at) as date,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE strftime('%Y-%m', created_at) = ?
         GROUP BY DATE(created_at)
         ORDER BY date DESC`;

    const result = await db.query(query, isPostgres ? [startDate] : [`${year}-${month.padStart(2, '0')}`]);

    // Get totals for the month
    const totalQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', $1::date)`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE strftime('%Y-%m', created_at) = ?`;

    const totalResult = await db.query(totalQuery, isPostgres ? [startDate] : [`${year}-${month.padStart(2, '0')}`]);

    // Get previous month totals for comparison
    const prevMonth = parseInt(month) === 1 ? 12 : parseInt(month) - 1;
    const prevYear = parseInt(month) === 1 ? parseInt(year) - 1 : parseInt(year);
    const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;

    const prevTotalResult = await db.query(totalQuery, isPostgres ? [prevStartDate] : [`${prevYear}-${String(prevMonth).padStart(2, '0')}`]);

    const current = totalResult.rows[0];
    const previous = prevTotalResult.rows[0];

    res.json({
      dailyStats: result.rows.map(row => ({
        date: row.date,
        orders: parseInt(row.orders),
        paidOrders: parseInt(row.paid_orders),
        revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      })),
      summary: {
        current: {
          orders: parseInt(current.orders),
          paidOrders: parseInt(current.paid_orders),
          revenue: Math.round(parseFloat(current.revenue) * 100) / 100,
        },
        previous: {
          orders: parseInt(previous.orders),
          paidOrders: parseInt(previous.paid_orders),
          revenue: Math.round(parseFloat(previous.revenue) * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stats for a specific year (monthly breakdown)
 */
const getYearDetail = async (req, res, next) => {
  try {
    const { year } = req.query;

    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }

    const query = isPostgres
      ? `SELECT
          DATE_TRUNC('month', created_at) as month,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE EXTRACT(YEAR FROM created_at) = $1
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month DESC`
      : `SELECT
          strftime('%Y-%m-01', created_at) as month,
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE strftime('%Y', created_at) = ?
         GROUP BY strftime('%Y-%m', created_at)
         ORDER BY month DESC`;

    const result = await db.query(query, [year]);

    // Get totals for the year
    const totalQuery = isPostgres
      ? `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE EXTRACT(YEAR FROM created_at) = $1`
      : `SELECT
          COUNT(*) as orders,
          COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END), 0) as revenue,
          COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as paid_orders
         FROM orders
         WHERE strftime('%Y', created_at) = ?`;

    const totalResult = await db.query(totalQuery, [year]);

    // Get previous year totals for comparison
    const prevYear = parseInt(year) - 1;
    const prevTotalResult = await db.query(totalQuery, [String(prevYear)]);

    const current = totalResult.rows[0];
    const previous = prevTotalResult.rows[0];

    res.json({
      monthlyStats: result.rows.map(row => ({
        month: row.month,
        orders: parseInt(row.orders),
        paidOrders: parseInt(row.paid_orders),
        revenue: Math.round(parseFloat(row.revenue) * 100) / 100,
      })),
      summary: {
        current: {
          orders: parseInt(current.orders),
          paidOrders: parseInt(current.paid_orders),
          revenue: Math.round(parseFloat(current.revenue) * 100) / 100,
        },
        previous: {
          orders: parseInt(previous.orders),
          paidOrders: parseInt(previous.paid_orders),
          revenue: Math.round(parseFloat(previous.revenue) * 100) / 100,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get available months and years for dropdown
 */
const getAvailablePeriods = async (req, res, next) => {
  try {
    // Get distinct months
    const monthsQuery = isPostgres
      ? `SELECT DISTINCT
          EXTRACT(YEAR FROM created_at) as year,
          EXTRACT(MONTH FROM created_at) as month
         FROM orders
         ORDER BY year DESC, month DESC`
      : `SELECT DISTINCT
          CAST(strftime('%Y', created_at) AS INTEGER) as year,
          CAST(strftime('%m', created_at) AS INTEGER) as month
         FROM orders
         ORDER BY year DESC, month DESC`;

    const monthsResult = await db.query(monthsQuery);

    // Get distinct years
    const yearsQuery = isPostgres
      ? `SELECT DISTINCT EXTRACT(YEAR FROM created_at) as year FROM orders ORDER BY year DESC`
      : `SELECT DISTINCT CAST(strftime('%Y', created_at) AS INTEGER) as year FROM orders ORDER BY year DESC`;

    const yearsResult = await db.query(yearsQuery);

    res.json({
      months: monthsResult.rows.map(row => ({
        year: parseInt(row.year),
        month: parseInt(row.month),
      })),
      years: yearsResult.rows.map(row => parseInt(row.year)),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get drill-down data for dashboard metrics
 * This endpoint ensures data integrity by using the same calculation logic
 * as the dashboard summary
 *
 * @query {string} metric - The metric to drill down: 'total_orders', 'total_revenue', 'net_earnings', 'total_fees'
 * @query {string} payment_status - Filter by payment status (optional)
 * @query {string} sort_by - Sort field: 'date', 'amount', 'fees', 'net' (default: 'date')
 * @query {string} sort_order - Sort direction: 'asc', 'desc' (default: 'desc')
 */
const getDrilldownData = async (req, res, next) => {
  try {
    const { metric, payment_status, sort_by = 'date', sort_order = 'desc' } = req.query;

    if (!metric) {
      return res.status(400).json({ error: 'Metric parameter is required' });
    }

    // Build WHERE clause based on metric
    let whereConditions = [];

    // For revenue, net_earnings, and total_fees, we only count paid orders
    if (['total_revenue', 'net_earnings', 'total_fees'].includes(metric)) {
      whereConditions.push("payment_status = 'paid'");
    }

    // Additional payment status filter
    if (payment_status && metric === 'total_orders') {
      whereConditions.push(isPostgres ? `payment_status = $1` : `payment_status = ?`);
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Query orders
    const params = payment_status && metric === 'total_orders' ? [payment_status] : [];

    const ordersQuery = `
      SELECT
        o.*,
        u.email as user_email,
        u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `;

    const ordersResult = await db.query(ordersQuery, params);

    // Calculate financials for each order (using the same logic as dashboard)
    const orders = [];
    let totalRevenue = 0;       // What customers paid (product + delivery) - matches dashboard
    let totalFees = 0;          // SenangPay fees
    let totalNetEarnings = 0;   // Revenue - fees
    let totalDeliveryFees = 0;

    for (const order of ordersResult.rows) {
      const financials = calculateOrderFinancials(order);

      // Accumulate totals (these match dashboard exactly)
      // All calculations use calculateOrderFinancials for consistency
      if (order.payment_status === 'paid') {
        totalRevenue += financials.orderTotal;      // Product + delivery
        totalFees += financials.senangPayFee;
        totalNetEarnings += financials.netEarnings;
        totalDeliveryFees += financials.deliveryFee;
      }

      orders.push({
        id: order.id,
        created_at: order.created_at,
        customer_name: order.shipping_name || order.user_name,
        customer_email: order.user_email || order.guest_email,
        shipping_phone: order.shipping_phone,
        payment_method: order.payment_method,
        payment_status: order.payment_status,
        status: order.status,
        financials: {
          productTotal: financials.productTotal,
          deliveryFee: financials.deliveryFee,
          orderTotal: financials.orderTotal,
          senangPayFee: financials.senangPayFee,
          senangPayFeeType: financials.senangPayFeeType,
          otherFees: financials.otherFees,
          totalFees: financials.totalFees,
          netEarnings: financials.netEarnings,
        },
      });
    }

    // Sort the orders
    const sortField = {
      'date': 'created_at',
      'amount': 'financials.orderTotal',
      'fees': 'financials.totalFees',
      'net': 'financials.netEarnings',
    }[sort_by] || 'created_at';

    orders.sort((a, b) => {
      let aVal, bVal;
      if (sortField === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else {
        const field = sortField.split('.')[1];
        aVal = a.financials[field];
        bVal = b.financials[field];
      }
      return sort_order === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Build summary based on metric
    let summary = {};

    switch (metric) {
      case 'total_orders':
        summary = {
          title: 'Total Orders',
          totalCount: orders.length,
          paidCount: orders.filter(o => o.payment_status === 'paid').length,
          unpaidCount: orders.filter(o => o.payment_status !== 'paid').length,
        };
        break;
      case 'total_revenue':
        summary = {
          title: 'Total Revenue',
          // Total Revenue = what customers paid (product + delivery)
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalDeliveryFees: Math.round(totalDeliveryFees * 100) / 100,
          orderCount: orders.length,
          averageOrderValue: orders.length > 0 ? Math.round((totalRevenue / orders.length) * 100) / 100 : 0,
        };
        break;
      case 'net_earnings':
        summary = {
          title: 'Net Earnings',
          // Net Earnings = Revenue - Fees (always less than revenue)
          totalNetEarnings: Math.round(totalNetEarnings * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          totalFees: Math.round(totalFees * 100) / 100,
          orderCount: orders.length,
        };
        break;
      case 'total_fees':
        summary = {
          title: 'Total Fees Paid',
          totalFees: Math.round(totalFees * 100) / 100,
          totalRevenue: Math.round(totalRevenue * 100) / 100,
          feePercentage: totalRevenue > 0 ? Math.round((totalFees / totalRevenue) * 10000) / 100 : 0,
          orderCount: orders.length,
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid metric' });
    }

    res.json({
      metric,
      summary,
      orders,
      _meta: {
        calculationNote: 'All figures are calculated using calculateOrderFinancials() for consistency',
        paidOrdersOnly: ['total_revenue', 'net_earnings', 'total_fees'].includes(metric),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all orders with full details and financial breakdown
 */
const getAllOrders = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const status = req.query.status;
    const paymentStatus = req.query.payment_status;
    const search = req.query.search;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      whereConditions.push(isPostgres ? `o.status = $${paramIndex}` : `o.status = ?`);
      params.push(status);
      paramIndex++;
    }

    if (paymentStatus) {
      whereConditions.push(isPostgres ? `o.payment_status = $${paramIndex}` : `o.payment_status = ?`);
      params.push(paymentStatus);
      paramIndex++;
    }

    if (search) {
      if (isPostgres) {
        whereConditions.push(`(
          o.shipping_name ILIKE $${paramIndex} OR
          o.shipping_phone ILIKE $${paramIndex} OR
          o.guest_email ILIKE $${paramIndex} OR
          u.email ILIKE $${paramIndex} OR
          u.name ILIKE $${paramIndex} OR
          CAST(o.id AS TEXT) = $${paramIndex + 1}
        )`);
        params.push(`%${search}%`);
        params.push(search);
        paramIndex += 2;
      } else {
        whereConditions.push(`(
          o.shipping_name LIKE ? OR
          o.shipping_phone LIKE ? OR
          o.guest_email LIKE ? OR
          u.email LIKE ? OR
          u.name LIKE ? OR
          CAST(o.id AS TEXT) = ?
        )`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, search);
      }
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Get total count
    const countResult = await db.query(`
      SELECT COUNT(*) as total
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
    `, params);

    const total = parseInt(countResult.rows[0].total);

    // Get orders with pagination
    const ordersQuery = isPostgres
      ? `SELECT
          o.*,
          u.email as user_email,
          u.name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`
      : `SELECT
          o.*,
          u.email as user_email,
          u.name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT ? OFFSET ?`;

    const ordersResult = await db.query(ordersQuery, [...params, limit, offset]);

    // Get items for each order and calculate financials
    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await db.query(
        isPostgres
          ? 'SELECT * FROM order_items WHERE order_id = $1'
          : 'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );

      const financials = calculateOrderFinancials(order);

      orders.push({
        ...order,
        customer_email: order.user_email || order.guest_email,
        customer_name: order.shipping_name || order.user_name,
        items: itemsResult.rows,
        financials,
      });
    }

    res.json({
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single order with full details
 */
const getOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderResult = await db.query(
      isPostgres
        ? `SELECT
            o.*,
            u.email as user_email,
            u.name as user_name,
            u.phone as user_phone
           FROM orders o
           LEFT JOIN users u ON o.user_id = u.id
           WHERE o.id = $1`
        : `SELECT
            o.*,
            u.email as user_email,
            u.name as user_name,
            u.phone as user_phone
           FROM orders o
           LEFT JOIN users u ON o.user_id = u.id
           WHERE o.id = ?`,
      [id]
    );

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    const itemsResult = await db.query(
      isPostgres
        ? 'SELECT * FROM order_items WHERE order_id = $1'
        : 'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    const financials = calculateOrderFinancials(order);

    res.json({
      order: {
        ...order,
        customer_email: order.user_email || order.guest_email,
        customer_name: order.shipping_name || order.user_name,
        items: itemsResult.rows,
        financials,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;

    const validStatuses = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status.' });
    }

    if (payment_status && !validPaymentStatuses.includes(payment_status)) {
      return res.status(400).json({ error: 'Invalid payment status.' });
    }

    let updateFields = [];
    let params = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(isPostgres ? `status = $${paramIndex}` : `status = ?`);
      params.push(status);
      paramIndex++;
    }

    if (payment_status) {
      updateFields.push(isPostgres ? `payment_status = $${paramIndex}` : `payment_status = ?`);
      params.push(payment_status);
      paramIndex++;
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update.' });
    }

    updateFields.push(isPostgres ? `updated_at = CURRENT_TIMESTAMP` : `updated_at = datetime('now')`);
    params.push(id);

    const updateQuery = isPostgres
      ? `UPDATE orders SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`
      : `UPDATE orders SET ${updateFields.join(', ')} WHERE id = ?`;

    const result = await db.query(updateQuery, params);

    // For SQLite, fetch the updated record
    let updatedOrder;
    if (isPostgres) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      updatedOrder = result.rows[0];
    } else {
      const fetchResult = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (fetchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      updatedOrder = fetchResult.rows[0];
    }

    // Get updated order with items
    const itemsResult = await db.query(
      isPostgres
        ? 'SELECT * FROM order_items WHERE order_id = $1'
        : 'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    const financials = calculateOrderFinancials(updatedOrder);

    res.json({
      message: 'Order updated successfully.',
      order: {
        ...updatedOrder,
        items: itemsResult.rows,
        financials,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update order delivery fee
 */
const updateOrderDeliveryFee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { delivery_fee } = req.body;

    if (delivery_fee === undefined || delivery_fee < 0) {
      return res.status(400).json({ error: 'Valid delivery fee is required.' });
    }

    const updateQuery = isPostgres
      ? `UPDATE orders SET delivery_fee = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`
      : `UPDATE orders SET delivery_fee = ?, updated_at = datetime('now') WHERE id = ?`;

    const result = await db.query(updateQuery, [delivery_fee, id]);

    let updatedOrder;
    if (isPostgres) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      updatedOrder = result.rows[0];
    } else {
      const fetchResult = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (fetchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      updatedOrder = fetchResult.rows[0];
    }

    const itemsResult = await db.query(
      isPostgres
        ? 'SELECT * FROM order_items WHERE order_id = $1'
        : 'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    const financials = calculateOrderFinancials(updatedOrder);

    res.json({
      message: 'Delivery fee updated successfully.',
      order: {
        ...updatedOrder,
        items: itemsResult.rows,
        financials,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get fee configuration
 */
const getFeeConfig = async (req, res, next) => {
  try {
    res.json({
      senangPayFees: SENANGPAY_FEES,
      defaultDeliveryFee: DEFAULT_DELIVERY_FEE,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all customers
 */
const getAllCustomers = async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT
        u.id,
        u.email,
        u.name,
        u.phone,
        u.created_at,
        COUNT(o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total_amount ELSE 0 END), 0) as total_spent
      FROM users u
      LEFT JOIN orders o ON u.id = o.user_id
      WHERE u.role = 'customer'
      GROUP BY u.id, u.email, u.name, u.phone, u.created_at
      ORDER BY total_spent DESC
    `);

    res.json({
      customers: result.rows.map(row => ({
        ...row,
        total_orders: parseInt(row.total_orders),
        total_spent: Math.round(parseFloat(row.total_spent) * 100) / 100,
      })),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export orders to CSV format
 */
const exportOrders = async (req, res, next) => {
  try {
    const { start_date, end_date, status, payment_status } = req.query;

    let whereConditions = [];
    let params = [];
    let paramIndex = 1;

    if (start_date) {
      whereConditions.push(isPostgres ? `o.created_at >= $${paramIndex}` : `o.created_at >= ?`);
      params.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(isPostgres ? `o.created_at <= $${paramIndex}` : `o.created_at <= ?`);
      params.push(end_date);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(isPostgres ? `o.status = $${paramIndex}` : `o.status = ?`);
      params.push(status);
      paramIndex++;
    }

    if (payment_status) {
      whereConditions.push(isPostgres ? `o.payment_status = $${paramIndex}` : `o.payment_status = ?`);
      params.push(payment_status);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    const ordersResult = await db.query(`
      SELECT
        o.*,
        u.email as user_email,
        u.name as user_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ${whereClause}
      ORDER BY o.created_at DESC
    `, params);

    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsResult = await db.query(
        isPostgres
          ? 'SELECT * FROM order_items WHERE order_id = $1'
          : 'SELECT * FROM order_items WHERE order_id = ?',
        [order.id]
      );

      const financials = calculateOrderFinancials(order);
      const itemsList = itemsResult.rows
        .map(item => `${item.product_name} x${item.quantity}`)
        .join('; ');

      orders.push({
        order_id: order.id,
        date: order.created_at,
        customer_name: order.shipping_name || order.user_name,
        customer_email: order.user_email || order.guest_email,
        customer_phone: order.shipping_phone,
        shipping_address: order.shipping_address,
        items: itemsList,
        product_total: financials.productTotal,
        delivery_fee: financials.deliveryFee,
        order_total: financials.orderTotal,
        payment_method: order.payment_method,
        senangpay_fee: financials.senangPayFee,
        total_fees: financials.totalFees,
        net_earnings: financials.netEarnings,
        payment_status: order.payment_status,
        order_status: order.status,
        transaction_id: order.transaction_id || '',
      });
    }

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Get orders ready for shipping (paid but not yet shipped, no tracking number)
 */
const getShippingOrders = async (req, res, next) => {
  try {
    const query = isPostgres
      ? `SELECT
          o.*,
          u.email as user_email,
          u.name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.payment_status = 'paid'
           AND (o.status = 'pending' OR o.status = 'confirmed' OR o.status = 'processing')
           AND (o.tracking_number IS NULL OR o.tracking_number = '')
         ORDER BY o.created_at ASC`
      : `SELECT
          o.*,
          u.email as user_email,
          u.name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.payment_status = 'paid'
           AND (o.status = 'pending' OR o.status = 'confirmed' OR o.status = 'processing')
           AND (o.tracking_number IS NULL OR o.tracking_number = '')
         ORDER BY o.created_at ASC`;

    const ordersResult = await db.query(query);

    // Get items for each order and calculate total weight
    const orders = [];
    for (const order of ordersResult.rows) {
      const itemsQuery = isPostgres
        ? `SELECT oi.*, p.weight
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = $1`
        : `SELECT oi.*, p.weight
           FROM order_items oi
           LEFT JOIN products p ON oi.product_id = p.id
           WHERE oi.order_id = ?`;

      const itemsResult = await db.query(itemsQuery, [order.id]);

      // Calculate total weight (sum of product weight * quantity)
      let totalWeight = 0;
      for (const item of itemsResult.rows) {
        const weight = parseFloat(item.weight) || 0.5; // Default to 0.5kg if no weight set
        totalWeight += weight * item.quantity;
      }

      orders.push({
        ...order,
        customer_email: order.user_email || order.guest_email,
        customer_name: order.shipping_name || order.user_name,
        items: itemsResult.rows,
        total_weight: Math.round(totalWeight * 1000) / 1000, // Round to 3 decimal places
      });
    }

    res.json({ orders });
  } catch (error) {
    next(error);
  }
};

/**
 * Get SPX data for a single order (for Chrome extension)
 */
const getOrderSpxData = async (req, res, next) => {
  try {
    const { id } = req.params;

    const orderQuery = isPostgres
      ? `SELECT
          o.*,
          u.email as user_email,
          u.name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = $1`
      : `SELECT
          o.*,
          u.email as user_email,
          u.name as user_name
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.id = ?`;

    const orderResult = await db.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderResult.rows[0];

    // Get items with product weights
    const itemsQuery = isPostgres
      ? `SELECT oi.*, p.weight
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`
      : `SELECT oi.*, p.weight
         FROM order_items oi
         LEFT JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = ?`;

    const itemsResult = await db.query(itemsQuery, [id]);

    // Calculate total weight
    let totalWeight = 0;
    for (const item of itemsResult.rows) {
      const weight = parseFloat(item.weight) || 0.5;
      totalWeight += weight * item.quantity;
    }

    // Return SPX-specific data format
    res.json({
      spxData: {
        orderId: order.id,
        receiverName: order.shipping_name,
        receiverPhone: order.shipping_phone,
        receiverAddress: order.shipping_address,
        receiverPostcode: order.shipping_postcode || '',
        totalWeight: Math.round(totalWeight * 1000) / 1000,
        items: itemsResult.rows.map(item => ({
          name: item.product_name,
          quantity: item.quantity,
          weight: parseFloat(item.weight) || 0.5,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save tracking number and mark order as shipped
 */
const updateOrderTracking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tracking_number } = req.body;

    if (!tracking_number || tracking_number.trim() === '') {
      return res.status(400).json({ error: 'Tracking number is required.' });
    }

    const updateQuery = isPostgres
      ? `UPDATE orders
         SET tracking_number = $1, status = 'shipped', updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING *`
      : `UPDATE orders
         SET tracking_number = ?, status = 'shipped', updated_at = datetime('now')
         WHERE id = ?`;

    const result = await db.query(updateQuery, [tracking_number.trim(), id]);

    let updatedOrder;
    if (isPostgres) {
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      updatedOrder = result.rows[0];
    } else {
      const fetchResult = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (fetchResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found.' });
      }
      updatedOrder = fetchResult.rows[0];
    }

    // Get order items
    const itemsResult = await db.query(
      isPostgres
        ? 'SELECT * FROM order_items WHERE order_id = $1'
        : 'SELECT * FROM order_items WHERE order_id = ?',
      [id]
    );

    const financials = calculateOrderFinancials(updatedOrder);

    res.json({
      message: 'Order marked as shipped with tracking number.',
      order: {
        ...updatedOrder,
        items: itemsResult.rows,
        financials,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export shipping orders to SPX Excel format
 */
const exportSpxExcel = async (req, res, next) => {
  try {
    const XLSX = require('xlsx');

    // Get orders ready for shipping (paid, not shipped)
    const ordersQuery = isPostgres
      ? `SELECT o.*, u.name as customer_name, u.email as customer_email
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.payment_status = 'paid' AND o.status != 'shipped' AND o.status != 'delivered'
         ORDER BY o.created_at DESC`
      : `SELECT o.*, u.name as customer_name, u.email as customer_email
         FROM orders o
         LEFT JOIN users u ON o.user_id = u.id
         WHERE o.payment_status = 'paid' AND o.status != 'shipped' AND o.status != 'delivered'
         ORDER BY o.created_at DESC`;

    const ordersResult = await db.query(ordersQuery);
    const orders = ordersResult.rows;

    // Build Excel data
    const excelData = [];

    // Header row (matching SPX template exactly)
    excelData.push([
      '*Recipient Name',
      '*Recipient Phone',
      '*Detail Address',
      'Postal Code',
      '*Parcel Weight (KG)',
      'Parcel Length (CM)',
      'Parcel Width (CM)',
      'Parcel Height (CM)',
      '*Item Name',
      'Item Quantity',
      'Customer Reference No.',
      '*COD Collection(Y/N )',
      'COD Amount',
      '*Payment Method',
      'Delivery Instruction',
      '*Parcel Value (Max 1000 MYR)'
    ]);

    // Data rows
    for (const order of orders) {
      // Get order items for weight and item name
      const itemsResult = await db.query(
        isPostgres
          ? `SELECT oi.*, p.name as product_name, p.weight as product_weight
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = $1`
          : `SELECT oi.*, p.name as product_name, p.weight as product_weight
             FROM order_items oi
             LEFT JOIN products p ON oi.product_id = p.id
             WHERE oi.order_id = ?`,
        [order.id]
      );

      // Calculate total weight
      let totalWeight = 0;
      const itemNames = [];
      let totalQuantity = 0;

      for (const item of itemsResult.rows) {
        const weight = parseFloat(item.product_weight) || 0.5;
        totalWeight += weight * item.quantity;
        itemNames.push(item.product_name || 'Product');
        totalQuantity += item.quantity;
      }

      // Format phone (remove +60, 60, or leading 0)
      let phone = (order.shipping_phone || '').replace(/[-\s]/g, '');
      if (phone.startsWith('+60')) phone = phone.substring(3);
      else if (phone.startsWith('60')) phone = phone.substring(2);
      if (!phone.startsWith('0')) phone = '0' + phone;

      excelData.push([
        order.shipping_name || order.customer_name || '',  // Recipient Name
        phone,                                              // Recipient Phone
        order.shipping_address || '',                       // Detail Address
        order.shipping_postcode || '',                      // Postal Code
        Math.max(0.5, Math.round(totalWeight * 100) / 100), // Parcel Weight (min 0.5kg)
        '',                                                 // Length
        '',                                                 // Width
        '',                                                 // Height
        itemNames.join(', '),                               // Item Name
        totalQuantity,                                      // Item Quantity
        `#${order.id}`,                                     // Customer Reference No.
        'N',                                                // COD Collection (N = prepaid)
        0,                                                  // COD Amount
        'Sender Pay',                                       // Payment Method
        '',                                                 // Delivery Instruction
        Math.min(200, parseFloat(order.total_amount) || 50)   // Parcel Value (cap at 200)
      ]);
    }

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Mass Order Creation');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Send file
    const filename = `spx_orders_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);

  } catch (error) {
    next(error);
  }
};

module.exports = {
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
};
