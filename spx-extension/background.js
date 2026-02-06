/**
 * SPX Extension Background Service Worker
 * Handles cross-origin messaging between admin dashboard and extension
 */

// Listen for messages from externally connected pages (admin dashboard)
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('[SPX Extension] Received external message:', message);

  if (message.type === 'SPX_ORDER_DATA') {
    // Store the order data
    chrome.storage.local.set({ spxOrderData: message.data }, () => {
      console.log('[SPX Extension] Order data saved:', message.data);
      sendResponse({ success: true, message: 'Order data saved' });
    });
    return true; // Required for async sendResponse
  }

  if (message.type === 'GET_ORDER_DATA') {
    chrome.storage.local.get(['spxOrderData'], (result) => {
      sendResponse({ success: true, data: result.spxOrderData || null });
    });
    return true;
  }

  if (message.type === 'CLEAR_ORDER_DATA') {
    chrome.storage.local.remove(['spxOrderData'], () => {
      sendResponse({ success: true, message: 'Order data cleared' });
    });
    return true;
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[SPX Extension] Received message from content script:', message);

  if (message.type === 'GET_ORDER_DATA') {
    chrome.storage.local.get(['spxOrderData'], (result) => {
      sendResponse({ success: true, data: result.spxOrderData || null });
    });
    return true;
  }

  if (message.type === 'CLEAR_ORDER_DATA') {
    chrome.storage.local.remove(['spxOrderData'], () => {
      sendResponse({ success: true, message: 'Order data cleared' });
    });
    return true;
  }

  if (message.type === 'FILL_COMPLETE') {
    // Notify any popup that's open
    chrome.runtime.sendMessage({ type: 'FILL_STATUS', status: 'complete', orderId: message.orderId });
    sendResponse({ success: true });
    return true;
  }
});

// Handle extension installation/update
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[SPX Extension] Installed:', details.reason);

  if (details.reason === 'install') {
    // First install - open instructions page
    console.log('[SPX Extension] First install - extension ID:', chrome.runtime.id);
  }
});
