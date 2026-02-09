/**
 * SPX Extension Content Script
 * Auto-fills SPX shipment forms
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
      <div class="spx-address-display" style="display: none; margin-top: 8px; padding: 8px; background: #e3f2fd; border-radius: 4px; font-size: 12px;">
        <strong>Address (Ctrl+V to paste):</strong><br>
        <span class="spx-address-value" style="word-break: break-word;"></span>
      </div>
      <div class="spx-postcode-display" style="display: none; margin-top: 8px; padding: 8px; background: #fff3e0; border-radius: 4px; font-weight: bold;">
        Postcode: <span class="spx-postcode-value"></span>
      </div>
    `;
    document.body.appendChild(statusIndicator);

    statusIndicator.querySelector('.spx-close-btn').addEventListener('click', () => {
      statusIndicator.style.display = 'none';
    });

    statusIndicator.querySelector('.spx-btn-fill').addEventListener('click', () => {
      if (orderData) fillForm(orderData);
    });

    statusIndicator.querySelector('.spx-btn-clear').addEventListener('click', () => {
      clearOrderData();
    });
  }

  function updateStatus(message, hasData = false, isError = false) {
    if (!statusIndicator) createStatusIndicator();

    const messageEl = statusIndicator.querySelector('.spx-status-message');
    const actionsEl = statusIndicator.querySelector('.spx-actions');

    messageEl.textContent = message;
    actionsEl.style.display = hasData ? 'flex' : 'none';

    statusIndicator.classList.remove('spx-success', 'spx-error', 'spx-ready');
    if (isError) statusIndicator.classList.add('spx-error');
    else if (hasData) statusIndicator.classList.add('spx-ready');

    statusIndicator.style.display = 'block';
  }

  function showSuccess(message) {
    if (!statusIndicator) return;
    statusIndicator.classList.remove('spx-ready', 'spx-error');
    statusIndicator.classList.add('spx-success');
    statusIndicator.querySelector('.spx-status-message').textContent = message;
    statusIndicator.querySelector('.spx-actions').style.display = 'none';
  }

  function showSuccessWithPostcode(message, postcode) {
    showSuccessWithAddressAndPostcode(message, null, postcode);
  }

  function showSuccessWithAddressAndPostcode(message, address, postcode) {
    if (!statusIndicator) return;
    statusIndicator.classList.remove('spx-ready', 'spx-error');
    statusIndicator.classList.add('spx-success');
    statusIndicator.querySelector('.spx-status-message').textContent = message;
    statusIndicator.querySelector('.spx-actions').style.display = 'none';

    // Show address (copied to clipboard)
    const addressDisplay = statusIndicator.querySelector('.spx-address-display');
    const addressValue = statusIndicator.querySelector('.spx-address-value');
    if (address && addressDisplay && addressValue) {
      addressValue.textContent = address;
      addressDisplay.style.display = 'block';
    }

    // Show postcode
    const postcodeDisplay = statusIndicator.querySelector('.spx-postcode-display');
    const postcodeValue = statusIndicator.querySelector('.spx-postcode-value');
    if (postcode && postcodeDisplay && postcodeValue) {
      postcodeValue.textContent = postcode;
      postcodeDisplay.style.display = 'block';
    }
  }

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

  // Set input value for React - simulate real typing
  function setInputValue(input, value) {
    if (!input || value === undefined || value === null) return false;

    const strValue = String(value);

    // Focus the input
    input.focus();
    input.click();

    // Clear existing value first
    input.select();
    document.execCommand('delete', false, null);

    // Try multiple methods to set value

    // Method 1: execCommand insertText (simulates typing)
    const inserted = document.execCommand('insertText', false, strValue);

    if (!inserted || input.value !== strValue) {
      // Method 2: Native setter + events
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      nativeSetter.call(input, strValue);

      // Dispatch multiple event types for React
      input.dispatchEvent(new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: strValue
      }));
    }

    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    console.log('[SPX Extension] Set value:', strValue, '| Actual:', input.value);
    return true;
  }

  // Find receiver inputs by position - they come after "Receiver Address" label
  function findReceiverInputs() {
    // Get all text inputs (not in dropdowns, not number type)
    const allInputs = Array.from(document.querySelectorAll('input[placeholder="Please Input"]'))
      .filter(inp => inp.type !== 'number' && !inp.closest('.ssc-select'));

    console.log('[SPX Extension] Total text inputs on page: ' + allInputs.length);

    // Find the "Receiver Address" header element
    let receiverHeader = null;
    const allElements = document.querySelectorAll('div, span, h1, h2, h3, h4, h5');
    for (const el of allElements) {
      const text = el.textContent.trim();
      // Match "Receiver Address" - check innerText to avoid matching parent containers
      if (text === 'Receiver Address' ||
          (text.startsWith('Receiver Address') && text.length < 25)) {
        // Prefer elements with shorter text (more specific)
        if (!receiverHeader || el.textContent.length < receiverHeader.textContent.length) {
          receiverHeader = el;
        }
      }
    }

    if (receiverHeader) {
      console.log('[SPX Extension] Found Receiver Address header: "' + receiverHeader.textContent.trim().substring(0, 30) + '"');
    }

    if (!receiverHeader) {
      console.log('[SPX Extension] Receiver Address header not found');
      return { phone: null, name: null, address: null };
    }

    // Get the vertical position of the receiver header
    const receiverRect = receiverHeader.getBoundingClientRect();
    console.log('[SPX Extension] Receiver header Y position: ' + receiverRect.top);

    // Find "Parcel Information" header to know where receiver section ends
    let parcelHeader = null;
    for (const el of allElements) {
      const text = el.textContent.trim();
      if (text === 'Parcel Information' ||
          (text.startsWith('Parcel Information') && text.length < 25)) {
        if (!parcelHeader || el.textContent.length < parcelHeader.textContent.length) {
          parcelHeader = el;
        }
      }
    }
    const parcelY = parcelHeader ? parcelHeader.getBoundingClientRect().top : 99999;
    console.log('[SPX Extension] Parcel header Y position: ' + parcelY);

    // Debug: log all input positions
    console.log('[SPX Extension] All input Y positions:');
    allInputs.forEach((input, idx) => {
      const rect = input.getBoundingClientRect();
      console.log('[SPX Extension]   Input ' + idx + ': Y=' + rect.top.toFixed(0));
    });

    // Find inputs that are below Receiver header but above Parcel header
    // Add some buffer (50px) to parcelY to catch inputs that might be close to the boundary
    const receiverInputs = allInputs.filter(input => {
      const rect = input.getBoundingClientRect();
      return rect.top > receiverRect.top && rect.top < (parcelY + 50);
    });

    console.log('[SPX Extension] Found ' + receiverInputs.length + ' inputs in Receiver section');

    // Sort by vertical position then horizontal (top to bottom, left to right)
    receiverInputs.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      // If on same row (within 20px), sort by X
      if (Math.abs(rectA.top - rectB.top) < 20) {
        return rectA.left - rectB.left;
      }
      return rectA.top - rectB.top;
    });

    // Find address input - look for form item with "Detailed Address" label
    let addressInput = null;
    const phoneInput = receiverInputs[0];
    const nameInput = receiverInputs[1];

    // Simple approach: find form item containing exactly "Detailed Address" label
    const formItems = document.querySelectorAll('.ssc-form-item');
    console.log('[SPX Extension] Scanning ' + formItems.length + ' form items for Detailed Address');

    for (const item of formItems) {
      // Look for label element with "Detailed Address" text
      const labels = item.querySelectorAll('.ssc-form-item-label, label, span');
      let isDetailedAddressItem = false;

      for (const label of labels) {
        if (label.textContent.trim() === 'Detailed Address') {
          isDetailedAddressItem = true;
          break;
        }
      }

      if (!isDetailedAddressItem) continue;

      console.log('[SPX Extension] Found Detailed Address form item');

      // Get all inputs in this form item
      const inputs = item.querySelectorAll('input');
      console.log('[SPX Extension] Form item has ' + inputs.length + ' inputs');

      for (const input of inputs) {
        // Skip if this is phone or name input
        if (input === phoneInput || input === nameInput) {
          console.log('[SPX Extension] Skipping: is phone or name input');
          continue;
        }
        if (input.closest('.ssc-select')) {
          console.log('[SPX Extension] Skipping: inside select dropdown');
          continue;
        }
        if (input.type === 'number' || input.type === 'hidden') {
          console.log('[SPX Extension] Skipping: type is ' + input.type);
          continue;
        }

        addressInput = input;
        console.log('[SPX Extension] SUCCESS: Found address input!');
        break;
      }
      if (addressInput) break;

      // Also try textarea
      const textarea = item.querySelector('textarea');
      if (textarea) {
        addressInput = textarea;
        console.log('[SPX Extension] Found address textarea in form item');
        break;
      }
    }

    // Debug: log all inputs and their Y positions if not found
    if (!addressInput) {
      console.log('[SPX Extension] Address not found. Logging form structure:');
      formItems.forEach((item, i) => {
        const rect = item.getBoundingClientRect();
        const inSection = rect.top > receiverRect.top && rect.top < parcelY;
        const hasDetailedAddr = item.textContent.includes('Detailed Address');
        if (inSection) {
          console.log(`[SPX Extension] FormItem ${i}: Y=${rect.top.toFixed(0)}, hasDetailedAddr=${hasDetailedAddr}`);
          const inputs = item.querySelectorAll('input, textarea');
          inputs.forEach(inp => {
            console.log(`[SPX Extension]   - ${inp.tagName} placeholder="${inp.placeholder}"`);
          });
        }
      });
    }

    console.log('[SPX Extension] Address input found:', !!addressInput);

    return {
      phone: receiverInputs[0] || null,
      name: receiverInputs[1] || null,
      address: addressInput
    };
  }

  // Find receiver dropdown for postcode
  function findReceiverDropdown() {
    const allDropdowns = Array.from(document.querySelectorAll('.ssc-select'));
    const allElements = document.querySelectorAll('div, span, h1, h2, h3, h4, h5');

    // Find headers (prefer shorter/more specific matches)
    let receiverHeader = null;
    let parcelHeader = null;

    for (const el of allElements) {
      const text = el.textContent.trim();
      if ((text === 'Receiver Address' || (text.startsWith('Receiver Address') && text.length < 25))) {
        if (!receiverHeader || el.textContent.length < receiverHeader.textContent.length) {
          receiverHeader = el;
        }
      }
      if ((text === 'Parcel Information' || (text.startsWith('Parcel Information') && text.length < 25))) {
        if (!parcelHeader || el.textContent.length < parcelHeader.textContent.length) {
          parcelHeader = el;
        }
      }
    }

    if (!receiverHeader) {
      console.log('[SPX Extension] Receiver header not found for dropdown');
      return null;
    }

    const receiverY = receiverHeader.getBoundingClientRect().top;
    const parcelY = parcelHeader ? parcelHeader.getBoundingClientRect().top : 99999;

    // Find dropdown between receiver and parcel sections
    for (const dropdown of allDropdowns) {
      const rect = dropdown.getBoundingClientRect();
      if (rect.top > receiverY && rect.top < parcelY) {
        console.log('[SPX Extension] Found receiver dropdown at Y: ' + rect.top);
        return dropdown;
      }
    }

    return null;
  }

  // Find dropdown within Receiver section by position
  function fillPostcode(postcode) {
    console.log('[SPX Extension] Filling postcode:', postcode);

    const dropdown = findReceiverDropdown();

    if (dropdown) {
      console.log('[SPX Extension] Found receiver dropdown by position');
      fillDropdownWithPostcode(dropdown, postcode);
    } else {
      // Fallback: use the last dropdown on page
      const allDropdowns = document.querySelectorAll('.ssc-select');
      console.log('[SPX Extension] Fallback: found ' + allDropdowns.length + ' dropdowns total');
      if (allDropdowns.length > 0) {
        fillDropdownWithPostcode(allDropdowns[allDropdowns.length - 1], postcode);
      }
    }
  }

  // Helper to fill a dropdown with postcode
  function fillDropdownWithPostcode(dropdown, postcode) {
    // Click to open dropdown
    const selector = dropdown.querySelector('.ssc-select-selector');
    if (selector) {
      selector.click();
      console.log('[SPX Extension] Clicked postcode dropdown');
    }

    // Wait then type postcode
    setTimeout(() => {
      const searchInput = dropdown.querySelector('input');
      if (searchInput) {
        searchInput.focus();

        const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        nativeSetter.call(searchInput, postcode);
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));

        console.log('[SPX Extension] Typed postcode: ' + postcode + ' - please select from dropdown');
      }
    }, 300);
  }

  // Main fill function
  function fillForm(data) {
    console.log('[SPX Extension] Filling form with data:', data);

    setTimeout(() => {
      let filledCount = 0;

      // Find receiver inputs by their position on page
      const receiverInputs = findReceiverInputs();

      // Fill phone
      if (receiverInputs.phone) {
        let phone = data.receiverPhone.replace(/[-\s]/g, '');
        if (phone.startsWith('+60')) phone = phone.substring(3);
        if (phone.startsWith('60')) phone = phone.substring(2);
        if (phone.startsWith('0')) phone = phone.substring(1);

        if (setInputValue(receiverInputs.phone, phone)) {
          console.log('[SPX Extension] Filled receiver phone:', phone);
          filledCount++;
        }
      }

      // Fill name
      if (receiverInputs.name) {
        if (setInputValue(receiverInputs.name, data.receiverName)) {
          console.log('[SPX Extension] Filled receiver name:', data.receiverName);
          filledCount++;
        }
      }

      // Copy address to clipboard (auto-fill doesn't work reliably)
      if (data.receiverAddress) {
        navigator.clipboard.writeText(data.receiverAddress).then(() => {
          console.log('[SPX Extension] Address copied to clipboard');
        }).catch(err => {
          console.log('[SPX Extension] Could not copy address:', err);
        });
      }

      if (!receiverInputs.phone && !receiverInputs.name) {
        console.log('[SPX Extension] Could not find phone/name inputs');
      }

      // Report results - show address for manual paste
      if (filledCount > 0) {
        const msg = `Order #${data.orderId}: Filled ${filledCount} fields`;
        showSuccessWithAddressAndPostcode(msg, data.receiverAddress, data.receiverPostcode);
        chrome.runtime.sendMessage({ type: 'FILL_COMPLETE', orderId: data.orderId });
      } else {
        updateStatus('Could not find form fields. Check console.', true, true);
      }

    }, 1500);
  }

  // Initialize
  createStatusIndicator();
  checkOrderData();

})();
