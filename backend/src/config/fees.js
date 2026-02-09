/**
 * SenangPay Fee Configuration
 *
 * IMPORTANT: These are the official SenangPay fees for Malaysia.
 * Update these values if SenangPay changes their fee structure.
 *
 * Fee calculation: MAX(percentage * amount, minimum_fee)
 */

const SENANGPAY_FEES = {
  // FPX (Online Banking) - 1.5% OR RM 1.00, whichever is higher
  fpx: {
    name: 'FPX (Online Banking)',
    percentage: 0.015, // 1.5%
    minimum: 1.00,     // RM 1.00
  },

  // Credit/Debit Card (Local) - 2.5% OR RM 0.65, whichever is higher
  card: {
    name: 'Credit/Debit Card',
    percentage: 0.025, // 2.5%
    minimum: 0.65,     // RM 0.65
  },

  // E-Wallets (Touch 'n Go, Boost, etc.) - 1.5% OR RM 0.65, whichever is higher
  ewallet: {
    name: 'E-Wallet (TNG/Boost)',
    percentage: 0.015, // 1.5%
    minimum: 0.65,     // RM 0.65
  },

  // Buy Now Pay Later (BNPL) options
  spaylater: {
    name: 'SPayLater',
    percentage: 0.02,  // 2.0%
    minimum: 0,        // No minimum
  },

  atome: {
    name: 'Atome',
    percentage: 0.055, // 5.5%
    minimum: 0,        // No minimum
  },

  grabpay_later: {
    name: 'GrabPay Later',
    percentage: 0.06,  // 6.0%
    minimum: 0,        // No minimum
  },

  // Default/Unknown payment method - assume highest common fee
  default: {
    name: 'Other',
    percentage: 0.025, // 2.5%
    minimum: 1.00,     // RM 1.00
  },
};

// Default delivery fee (in RM)
const DEFAULT_DELIVERY_FEE = 8.00;

// Free shipping threshold (in RM)
const FREE_SHIPPING_THRESHOLD = 150;

// SPX Express shipping rates for West Malaysia (Including SST)
// 0-2 kg: RM 6.89
// 3+ kg:  RM 9.00 + (kg - 3) * RM 1.00 per additional kg
function calculateSpxShipping(totalWeightKg) {
  if (totalWeightKg <= 0) return 6.89; // Minimum rate if weight unknown
  const weight = Math.ceil(totalWeightKg);
  if (weight <= 2) return 6.89;
  return 9.00 + (weight - 3) * 1.00;
}

/**
 * Calculate delivery fee based on total weight and subtotal
 * Free shipping for orders >= RM150
 * @param {number} totalWeightKg - Total weight in kg
 * @param {number} subtotal - Order subtotal in RM
 * @returns {number} - Delivery fee in RM
 */
function calculateDeliveryFee(totalWeightKg, subtotal) {
  if (subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return calculateSpxShipping(totalWeightKg);
}

// State-based delivery fees (optional - for future use)
const STATE_DELIVERY_FEES = {
  'Selangor': 8.00,
  'Kuala Lumpur': 8.00,
  'Putrajaya': 8.00,
  'Negeri Sembilan': 10.00,
  'Melaka': 10.00,
  'Johor': 12.00,
  'Perak': 12.00,
  'Penang': 15.00,
  'Kedah': 15.00,
  'Perlis': 18.00,
  'Kelantan': 18.00,
  'Terengganu': 18.00,
  'Pahang': 15.00,
  'Sabah': 25.00,
  'Sarawak': 25.00,
  'Labuan': 25.00,
};

/**
 * Calculate SenangPay transaction fee
 * @param {number} amount - Transaction amount in RM
 * @param {string} paymentType - Payment type code (fpx, card, ewallet, etc.)
 * @returns {object} - { fee, feeType, percentage, minimum }
 */
function calculateSenangPayFee(amount, paymentType) {
  const feeConfig = SENANGPAY_FEES[paymentType] || SENANGPAY_FEES.default;
  const percentageFee = amount * feeConfig.percentage;
  const fee = Math.max(percentageFee, feeConfig.minimum);

  return {
    fee: Math.round(fee * 100) / 100, // Round to 2 decimal places
    feeType: feeConfig.name,
    percentage: feeConfig.percentage * 100,
    minimum: feeConfig.minimum,
    calculatedFrom: percentageFee >= feeConfig.minimum ? 'percentage' : 'minimum',
  };
}

/**
 * Get delivery fee based on state (or default)
 * @param {string} state - Malaysian state name
 * @returns {number} - Delivery fee in RM
 */
function getDeliveryFee(state) {
  if (state && STATE_DELIVERY_FEES[state]) {
    return STATE_DELIVERY_FEES[state];
  }
  return DEFAULT_DELIVERY_FEE;
}

/**
 * Map SenangPay payment method to our fee type
 * @param {string} paymentMethod - Raw payment method from SenangPay
 * @returns {string} - Fee type code
 */
function mapPaymentMethodToFeeType(paymentMethod) {
  if (!paymentMethod) return 'default';

  const method = paymentMethod.toLowerCase();

  if (method.includes('fpx') || method.includes('online banking')) {
    return 'fpx';
  }
  if (method.includes('card') || method.includes('visa') || method.includes('mastercard')) {
    return 'card';
  }
  if (method.includes('tng') || method.includes('touch') || method.includes('boost') || method.includes('ewallet') || method.includes('e-wallet')) {
    return 'ewallet';
  }
  if (method.includes('spaylater') || method.includes('shopee')) {
    return 'spaylater';
  }
  if (method.includes('atome')) {
    return 'atome';
  }
  if (method.includes('grabpay') && method.includes('later')) {
    return 'grabpay_later';
  }

  return 'default';
}

/**
 * Calculate complete financial breakdown for an order
 * @param {object} order - Order object with total_amount, payment_method, delivery_fee
 * @returns {object} - Complete financial breakdown
 */
function calculateOrderFinancials(order) {
  const productTotal = parseFloat(order.total_amount) || 0;
  const deliveryFee = parseFloat(order.delivery_fee) || DEFAULT_DELIVERY_FEE;
  const orderTotal = productTotal + deliveryFee;

  const feeType = mapPaymentMethodToFeeType(order.payment_method);
  const senangPayFeeInfo = calculateSenangPayFee(orderTotal, feeType);

  const otherFees = 0; // Placeholder for future additional fees
  const totalFees = senangPayFeeInfo.fee + otherFees;
  const netEarnings = orderTotal - totalFees;

  return {
    productTotal: Math.round(productTotal * 100) / 100,
    deliveryFee: Math.round(deliveryFee * 100) / 100,
    orderTotal: Math.round(orderTotal * 100) / 100,
    senangPayFee: senangPayFeeInfo.fee,
    senangPayFeeType: senangPayFeeInfo.feeType,
    senangPayFeePercentage: senangPayFeeInfo.percentage,
    senangPayFeeMinimum: senangPayFeeInfo.minimum,
    senangPayFeeCalculatedFrom: senangPayFeeInfo.calculatedFrom,
    otherFees: otherFees,
    totalFees: Math.round(totalFees * 100) / 100,
    netEarnings: Math.round(netEarnings * 100) / 100,
  };
}

module.exports = {
  SENANGPAY_FEES,
  DEFAULT_DELIVERY_FEE,
  FREE_SHIPPING_THRESHOLD,
  STATE_DELIVERY_FEES,
  calculateSenangPayFee,
  calculateSpxShipping,
  calculateDeliveryFee,
  getDeliveryFee,
  mapPaymentMethodToFeeType,
  calculateOrderFinancials,
};
