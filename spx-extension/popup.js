/**
 * SPX Extension Popup Script
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusBox = document.getElementById('status-box');
  const orderDetails = document.getElementById('order-details');
  const btnClear = document.getElementById('btn-clear');
  const btnOpenShopee = document.getElementById('btn-open-shopee');
  const extensionIdEl = document.getElementById('extension-id');

  // Display extension ID
  extensionIdEl.textContent = chrome.runtime.id;

  // Load order data
  chrome.storage.local.get(['spxOrderData'], (result) => {
    if (result.spxOrderData) {
      displayOrderData(result.spxOrderData);
    } else {
      displayNoData();
    }
  });

  function displayOrderData(data) {
    statusBox.className = 'status-box has-data';
    statusBox.innerHTML = `
      <div class="status-title">Order Ready</div>
      <p style="font-size: 12px; color: #2e7d32;">Data loaded for auto-fill</p>
    `;

    orderDetails.style.display = 'block';
    document.getElementById('order-id').textContent = `#${data.orderId}`;
    document.getElementById('order-name').textContent = data.receiverName || '-';
    document.getElementById('order-phone').textContent = data.receiverPhone || '-';
    document.getElementById('order-postcode').textContent = data.receiverPostcode || 'N/A';
    document.getElementById('order-weight').textContent = `${data.totalWeight} kg`;

    btnClear.style.display = 'flex';
  }

  function displayNoData() {
    statusBox.className = 'status-box no-data';
    statusBox.innerHTML = `
      <div class="status-title">No Order Data</div>
      <p style="font-size: 12px; color: #e65100;">Click "Create SPX" in admin dashboard to load an order</p>
    `;

    orderDetails.style.display = 'none';
    btnClear.style.display = 'none';
  }

  // Open Shopee Seller Centre
  btnOpenShopee.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'https://seller.shopee.com.my/portal/logistics/shipment'
    });
  });

  // Clear order data
  btnClear.addEventListener('click', () => {
    chrome.storage.local.remove(['spxOrderData'], () => {
      displayNoData();
    });
  });

  // Listen for status updates
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FILL_STATUS' && message.status === 'complete') {
      statusBox.className = 'status-box has-data';
      statusBox.innerHTML = `
        <div class="status-title">Form Filled!</div>
        <p style="font-size: 12px; color: #2e7d32;">Order #${message.orderId} data has been filled</p>
      `;
    }
  });
});
