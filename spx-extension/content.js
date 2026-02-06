/**
 * SPX Extension Content Script
 * Auto-fills Shopee Seller Centre shipment forms
 */

(function() {
  'use strict';

  console.log('[SPX Extension] Content script loaded on:', window.location.href);

  let orderData = null;
  let statusIndicator = null;

  // Create and inject status indicator
  function createStatusIndicator() {
    if (statusIndicator) return;

    statusIndicator = document.createElement('div');
    statusIndicator.id = 'spx-status-indicator';
    statusIndicator.innerHTML = `
      <div class="spx-status-content">
        <div class="spx-status-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        </div>
        <div class="spx-status-text">
          <strong>SPX Auto-Fill</strong>
          <span class="spx-status-message">Checking for order data...</span>
        </div>
        <button class="spx-close-btn">&times;</button>
      </div>
      <div class="spx-actions" style="display: none;">
        <button class="spx-btn spx-btn-fill">Fill Form</button>
        <button class="spx-btn spx-btn-clear">Clear</button>
      </div>
    `;
    document.body.appendChild(statusIndicator);

    // Add close button handler
    statusIndicator.querySelector('.spx-close-btn').addEventListener('click', () => {
      statusIndicator.style.display = 'none';
    });

    // Add fill button handler
    statusIndicator.querySelector('.spx-btn-fill').addEventListener('click', () => {
      if (orderData) {
        fillForm(orderData);
      }
    });

    // Add clear button handler
    statusIndicator.querySelector('.spx-btn-clear').addEventListener('click', () => {
      clearOrderData();
    });
  }

  function updateStatus(message, hasData = false, isError = false) {
    if (!statusIndicator) createStatusIndicator();

    const messageEl = statusIndicator.querySelector('.spx-status-message');
    const actionsEl = statusIndicator.querySelector('.spx-actions');
    const iconEl = statusIndicator.querySelector('.spx-status-icon');

    messageEl.textContent = message;
    actionsEl.style.display = hasData ? 'flex' : 'none';

    if (isError) {
      statusIndicator.classList.add('spx-error');
      statusIndicator.classList.remove('spx-success', 'spx-ready');
    } else if (hasData) {
      statusIndicator.classList.add('spx-ready');
      statusIndicator.classList.remove('spx-success', 'spx-error');
    } else {
      statusIndicator.classList.remove('spx-success', 'spx-error', 'spx-ready');
    }

    statusIndicator.style.display = 'block';
  }

  function showSuccess(message) {
    if (!statusIndicator) return;
    statusIndicator.classList.remove('spx-ready', 'spx-error');
    statusIndicator.classList.add('spx-success');
    statusIndicator.querySelector('.spx-status-message').textContent = message;
    statusIndicator.querySelector('.spx-actions').style.display = 'none';
  }

  // Check for order data on load
  function checkOrderData() {
    chrome.runtime.sendMessage({ type: 'GET_ORDER_DATA' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('[SPX Extension] Error getting order data:', chrome.runtime.lastError);
        updateStatus('Extension error - please reload', false, true);
        return;
      }

      if (response && response.success && response.data) {
        orderData = response.data;
        console.log('[SPX Extension] Order data found:', orderData);
        updateStatus(`Order #${orderData.orderId} ready to fill`, true);
      } else {
        updateStatus('No order data. Click "Create SPX" in admin.', false);
      }
    });
  }

  function clearOrderData() {
    chrome.runtime.sendMessage({ type: 'CLEAR_ORDER_DATA' }, (response) => {
      orderData = null;
      updateStatus('Order data cleared', false);
    });
  }

  // Helper to find input by various methods
  function findInput(selectors, parentElement = document) {
    for (const selector of selectors) {
      try {
        const el = parentElement.querySelector(selector);
        if (el) return el;
      } catch {
        continue;
      }
    }
    return null;
  }

  // Helper to set input value and trigger events
  function setInputValue(input, value) {
    if (!input || value === undefined || value === null) return false;

    // Focus the input
    input.focus();

    // Clear existing value
    input.value = '';

    // Set new value
    input.value = value;

    // Trigger various events that React/Vue might listen to
    const events = ['input', 'change', 'blur'];
    events.forEach(eventType => {
      const event = new Event(eventType, { bubbles: true, cancelable: true });
      input.dispatchEvent(event);
    });

    // Also try InputEvent for React
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: value
    });
    input.dispatchEvent(inputEvent);

    console.log(`[SPX Extension] Set value for:`, input, 'to:', value);
    return true;
  }

  // Fill the Shopee shipment form
  function fillForm(data) {
    console.log('[SPX Extension] Filling form with data:', data);

    // Wait a bit for the page to be fully loaded
    setTimeout(() => {
      let filledCount = 0;

      // Common selectors for Shopee Seller Centre
      // These may need adjustment based on actual Shopee page structure

      // Receiver Name
      const nameSelectors = [
        'input[placeholder*="name" i]',
        'input[placeholder*="nama" i]',
        'input[name*="name" i]',
        'input[data-testid*="name" i]',
        '[class*="receiver"] input[type="text"]',
        'input[aria-label*="name" i]'
      ];
      const nameInput = findInput(nameSelectors);
      if (nameInput && setInputValue(nameInput, data.receiverName)) filledCount++;

      // Phone Number
      const phoneSelectors = [
        'input[placeholder*="phone" i]',
        'input[placeholder*="telefon" i]',
        'input[placeholder*="mobile" i]',
        'input[type="tel"]',
        'input[name*="phone" i]',
        '[class*="phone"] input',
        'input[aria-label*="phone" i]'
      ];
      const phoneInput = findInput(phoneSelectors);
      if (phoneInput && setInputValue(phoneInput, data.receiverPhone)) filledCount++;

      // Address
      const addressSelectors = [
        'textarea[placeholder*="address" i]',
        'textarea[placeholder*="alamat" i]',
        'input[placeholder*="address" i]',
        'textarea[name*="address" i]',
        '[class*="address"] textarea',
        '[class*="address"] input',
        'textarea[aria-label*="address" i]'
      ];
      const addressInput = findInput(addressSelectors);
      if (addressInput && setInputValue(addressInput, data.receiverAddress)) filledCount++;

      // Postcode
      const postcodeSelectors = [
        'input[placeholder*="postcode" i]',
        'input[placeholder*="poskod" i]',
        'input[placeholder*="zip" i]',
        'input[name*="postcode" i]',
        'input[name*="zip" i]',
        '[class*="postcode"] input',
        '[class*="postal"] input',
        'input[maxlength="5"]'
      ];
      const postcodeInput = findInput(postcodeSelectors);
      if (postcodeInput && data.receiverPostcode && setInputValue(postcodeInput, data.receiverPostcode)) filledCount++;

      // Weight
      const weightSelectors = [
        'input[placeholder*="weight" i]',
        'input[placeholder*="berat" i]',
        'input[name*="weight" i]',
        '[class*="weight"] input',
        'input[type="number"][step]'
      ];
      const weightInput = findInput(weightSelectors);
      if (weightInput && setInputValue(weightInput, data.totalWeight.toString())) filledCount++;

      // Report results
      if (filledCount > 0) {
        showSuccess(`Filled ${filledCount} fields for Order #${data.orderId}`);
        chrome.runtime.sendMessage({ type: 'FILL_COMPLETE', orderId: data.orderId });
      } else {
        updateStatus('Could not find form fields. Try manual entry.', true, true);
      }

    }, 500);
  }

  // Initialize
  createStatusIndicator();
  checkOrderData();

  // Re-check when page content changes (SPA navigation)
  const observer = new MutationObserver((mutations) => {
    // Only recheck if significant DOM changes occurred
    const significantChange = mutations.some(m =>
      m.addedNodes.length > 5 || m.removedNodes.length > 5
    );
    if (significantChange && orderData) {
      // Page changed, might need to re-fill
      console.log('[SPX Extension] Significant DOM change detected');
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();
