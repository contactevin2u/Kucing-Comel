# Kucing Comel SPX Auto-Fill Extension

Chrome extension for auto-filling Shopee Express (SPX) shipment forms from Kucing Comel admin dashboard.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select this `spx-extension` folder
5. Note the **Extension ID** shown (you'll need this for admin settings)

## Setup

### Update Extension ID in Admin

After installing the extension, copy the Extension ID and update it in:
`frontend/src/admin/pages/AdminShipping.jsx`

```javascript
const EXTENSION_ID = 'your-extension-id-here';
```

### Icon Files

The extension requires PNG icon files. You can create simple icons or use your brand icons:
- `icons/icon16.png` (16x16 pixels)
- `icons/icon32.png` (32x32 pixels)
- `icons/icon48.png` (48x48 pixels)
- `icons/icon128.png` (128x128 pixels)

You can convert the SVG files to PNG using any image editor or online converter.

## Usage

1. Go to Admin Dashboard > Shipping
2. Find an order ready to ship
3. Click "Create SPX" button
4. Extension will save order data and open Shopee Seller Centre
5. On Shopee shipment page, click "Fill Form" in the extension popup (bottom right)
6. Review auto-filled data and complete the waybill manually
7. Copy the tracking number from Shopee
8. Back in admin, enter tracking number and click "Mark Shipped"

## How It Works

1. **Admin Dashboard** sends order data to the extension via `chrome.runtime.sendMessage`
2. **Background Script** stores data in `chrome.storage.local`
3. **Content Script** runs on Shopee Seller Centre pages
4. When user clicks "Fill Form", content script auto-fills form fields
5. Extension stops before waybill generation (manual step for safety)

## Troubleshooting

### Extension not receiving data
- Make sure the Extension ID is correctly set in AdminShipping.jsx
- Check that localhost is in the `externally_connectable` list in manifest.json
- Reload the extension after making changes

### Form fields not being filled
- Shopee may have updated their page structure
- Check console for errors (Right-click > Inspect > Console)
- Update selectors in `content.js` if needed

### Data not persisting
- Check Chrome's extension permissions
- Try reloading the extension

## Development

To modify the extension:

1. Edit files in this folder
2. Go to `chrome://extensions/`
3. Click the reload icon on the extension card
4. Refresh the Shopee page

## Files

- `manifest.json` - Extension configuration
- `background.js` - Service worker for storage/messaging
- `content.js` - Auto-fill script injected into Shopee pages
- `content.css` - Styles for status indicator
- `popup.html/js` - Extension popup UI
