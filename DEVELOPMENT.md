# UTM Link Generator - Development Guide

## Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/utm-link-generator.git
   cd utm-link-generator
   ```

2. **Load in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked" and select the project directory
   - The extension should appear in your toolbar

3. **Test the extension**
   - Click the extension icon to open the popup
   - Try generating a UTM link
   - Check the options page: right-click icon → Options

## Extension Architecture

### Core Components

1. **Background Service Worker** (`background/service-worker.js`)
   - Handles message routing between components
   - Manages license validation and premium features
   - Handles alarms and scheduled tasks
   - Provides storage operations

2. **UTM Engine** (`background/utm-engine.js`)
   - Core UTM generation logic
   - Parameter validation and cleaning
   - Template processing
   - Bulk generation capabilities
   - CSV export functionality

3. **Popup Interface** (`popup/`)
   - Main user interface for UTM generation
   - Form validation and real-time feedback
   - Template selection and application
   - History display and search

4. **Options Page** (`options/`)
   - Settings and configuration management
   - Template creation and editing
   - Integration setup (Google Sheets)
   - License activation interface

5. **Content Script** (`content/content-script.js`)
   - Page context analysis for auto-fill
   - Quick access overlay functionality
   - Clipboard operations
   - Page metadata extraction

6. **Storage Manager** (`utils/storage.js`)
   - Chrome storage API wrapper
   - Data validation and migration
   - Sync vs local storage management
   - Error handling and recovery

### Message Flow

```
Popup ←→ Background Service Worker ←→ Content Script
  ↓              ↓                        ↓
Options      UTM Engine               Page Context
  ↓              ↓                        ↓
Storage      License Check           Auto-fill Data
```

## Development Workflow

### 1. Making Changes

- **Popup changes**: Edit files in `popup/` directory
- **Options changes**: Edit files in `options/` directory
- **Core logic changes**: Edit files in `background/` directory
- **Content script changes**: Edit `content/content-script.js`

### 2. Testing Changes

1. **Reload extension**: Go to `chrome://extensions/` and click the reload button
2. **Test popup**: Click extension icon and verify functionality
3. **Test options**: Right-click icon → Options and verify settings
4. **Test content script**: Visit a website and test auto-fill functionality

### 3. Debugging

#### Background Script Debugging
```javascript
// Add to service-worker.js
console.log('Debug message:', data);
```
View logs in: `chrome://extensions/` → Click "Inspect views: service worker"

#### Popup Debugging
- Right-click on popup → "Inspect"
- Use Chrome DevTools as normal

#### Content Script Debugging
- Open DevTools on any webpage (F12)
- Content script logs appear in the Console tab

#### Storage Debugging
```javascript
// View all storage data
chrome.storage.sync.get(null, console.log);
chrome.storage.local.get(null, console.log);
```

## Code Organization

### File Naming Conventions
- Use kebab-case for file names: `utm-engine.js`
- Use camelCase for JavaScript variables: `utmParams`
- Use PascalCase for classes: `UTMEngine`

### Import/Export Pattern
```javascript
// constants.js
export const CONFIG = {...};

// utm-engine.js
import { CONFIG } from '../utils/constants.js';
export class UTMEngine {...}

// service-worker.js
import { UTMEngine } from './utm-engine.js';
```

### Error Handling
```javascript
// Always wrap async operations
try {
  const result = await storage.getTemplates();
  // Handle success
} catch (error) {
  console.error('Operation failed:', error);
  // Handle error gracefully
}
```

## Testing

### Manual Testing Checklist

#### Basic Functionality
- [ ] Extension loads without errors
- [ ] Popup opens and displays form
- [ ] Can generate basic UTM link
- [ ] Auto-copy to clipboard works
- [ ] History saves generated links

#### Template System
- [ ] Can create new template
- [ ] Can apply template to form
- [ ] Can edit existing template
- [ ] Can delete template
- [ ] Template patterns work ({date}, {month}, etc.)

#### Settings & Options
- [ ] Settings persist after browser restart
- [ ] Validation rules apply correctly
- [ ] Default values populate form
- [ ] Options page loads without errors

#### Content Script
- [ ] Auto-fill detects page context
- [ ] Quick overlay appears on demand
- [ ] Clipboard operations work
- [ ] Page URL is cleaned of existing UTM params

#### Premium Features
- [ ] Free tier limits are enforced
- [ ] Premium gates show upgrade prompts
- [ ] License activation flow works
- [ ] Premium features unlock after activation

### Automated Testing Setup

```javascript
// Example unit test for UTM engine
import { UTMEngine } from '../background/utm-engine.js';

const engine = new UTMEngine();

// Test basic generation
const result = engine.generateUTMUrl('https://example.com', {
  utm_source: 'test',
  utm_medium: 'test',
  utm_campaign: 'test'
});

console.assert(result.success, 'Generation should succeed');
console.assert(result.url.includes('utm_source=test'), 'URL should contain source');
```

## Storage Management

### Data Structure
```javascript
// Sync storage (synced across devices)
{
  templates: [
    {
      id: 'template_123',
      name: 'Email Campaign',
      fields: {
        source: 'email',
        medium: 'email',
        campaignPattern: 'newsletter-{date}'
      },
      createdAt: 1640995200000
    }
  ],
  settings: {
    defaultSource: '',
    defaultMedium: '',
    lowercaseEnforced: true,
    hyphenateSpaces: true,
    autoCopy: true
  },
  integrations: {
    googleSheets: {
      enabled: false,
      sheetId: '',
      lastSync: null
    }
  },
  isPremium: false,
  licenseKey: '',
  schemaVersion: 1
}

// Local storage (device-specific)
{
  history: [
    {
      id: 'history_456',
      url: 'https://example.com',
      utmUrl: 'https://example.com?utm_source=email...',
      templateId: 'template_123',
      createdBy: 'user',
      createdAt: 1640995200000
    }
  ]
}
```

### Storage Limits
- Sync storage: 100KB total, 8KB per item
- Local storage: 5MB (unlimited for extensions)
- Use sync for settings, local for large data like history

### Migration Strategy
```javascript
// utils/storage.js
async migrate(fromVersion) {
  switch (fromVersion) {
    case 0:
      // Initial migration
      break;
    case 1:
      // Add new fields
      const templates = await this.getTemplates();
      templates.forEach(t => t.newField = 'defaultValue');
      await this.setTemplates(templates);
      break;
  }
}
```

## Premium Features Implementation

### Feature Gating
```javascript
// Check premium status before allowing feature
const isPremium = await storage.getIsPremium();
if (!isPremium && action === 'bulk_generate') {
  showPremiumModal('Bulk Generation', 'This feature requires Pro subscription');
  return;
}
```

### License Validation
```javascript
// Mock validation - replace with real API
async function validateLicenseKey(key) {
  const response = await fetch('https://api.utmgenerator.com/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ licenseKey: key })
  });
  return response.json();
}
```

### Freemium Limits
```javascript
// constants.js
export const FREE_LIMITS = {
  HISTORY_SIZE: 50,
  TEMPLATES: 5,
  BULK_GENERATION: 10
};

// Enforce limits
if (!isPremium && templates.length >= FREE_LIMITS.TEMPLATES) {
  throw new Error('Free tier limited to 5 templates');
}
```

## Performance Optimization

### Memory Management
- Use efficient data structures
- Clean up event listeners
- Avoid memory leaks in content scripts
- Use debouncing for expensive operations

### Storage Optimization
- Compress large data before storing
- Use pagination for large datasets
- Clean up old history entries automatically
- Batch storage operations

### UI Performance
```javascript
// Debounce search input
const searchDebounced = debounce((query) => {
  performSearch(query);
}, 300);

// Virtual scrolling for large lists
function renderVisibleItems(startIndex, endIndex) {
  // Only render items in view
}
```

## Publishing to Chrome Web Store

### Pre-publication Checklist
- [ ] Remove all console.log statements
- [ ] Test on clean Chrome profile
- [ ] Verify all permissions are necessary
- [ ] Update version in manifest.json
- [ ] Create store listing assets
- [ ] Write clear privacy policy
- [ ] Test premium features thoroughly

### Store Assets Required
- Icon: 128x128 PNG
- Screenshots: 1280x800 PNG (at least 1)
- Promotional tile: 440x280 PNG
- Marquee: 1400x560 PNG (optional)

### Manifest V3 Compliance
- Use service worker instead of background page
- Use chrome.action instead of chrome.browserAction
- Use chrome.scripting instead of chrome.tabs.executeScript
- Declare host permissions explicitly

## Common Issues and Solutions

### Extension Not Loading
1. Check manifest.json syntax
2. Verify all file paths exist
3. Check for JavaScript errors in background script
4. Ensure proper permissions declared

### Popup Not Opening
1. Check popup.html path in manifest
2. Verify popup.js loads without errors
3. Check for CSS issues hiding content
4. Test popup dimensions and responsiveness

### Storage Issues
1. Check Chrome storage quota usage
2. Verify data format matches schema
3. Handle storage.sync quota exceeded errors
4. Test storage operations in incognito mode

### Content Script Issues
1. Verify content script injection timing
2. Check for conflicts with page scripts
3. Handle pages with CSP restrictions
4. Test on different types of websites

## Contributing Guidelines

1. **Code Style**
   - Use Prettier for formatting
   - Follow ESLint rules
   - Write descriptive commit messages
   - Include JSDoc comments

2. **Testing**
   - Test on multiple websites
   - Verify all user flows work
   - Check premium/free tier boundaries
   - Test error conditions

3. **Documentation**
   - Update README for new features
   - Add inline code comments
   - Update this development guide
   - Include examples in docs

4. **Pull Requests**
   - Include description of changes
   - Add screenshots for UI changes
   - Reference related issues
   - Keep changes focused and atomic

## Deployment

### Version Numbering
- Major: Breaking changes (1.0.0 → 2.0.0)
- Minor: New features (1.0.0 → 1.1.0)  
- Patch: Bug fixes (1.0.0 → 1.0.1)

### Release Process
1. Update version in manifest.json
2. Update CHANGELOG.md
3. Test thoroughly
4. Create release branch
5. Submit to Chrome Web Store
6. Monitor for issues post-release

---

For questions or support, contact the development team or create an issue in the repository.
