# UTM Link Generator Chrome Extension

A professional-grade Chrome browser extension that simplifies creating, validating, storing, and inserting UTM-tagged links for marketing campaigns and analytics tracking.

## Features

### Core Features
- **One-click UTM Builder** - Generate validated UTM-tagged URLs with source, medium, campaign, term, and content parameters
- **Auto-fill from Page** - Automatically populate UTM fields using current page context and smart heuristics
- **Reusable Templates** - Save and reuse UTM parameter combinations with naming conventions
- **Real-time Validation** - Enforce lowercase, hyphenated words, required fields, and forbidden characters
- **Auto-copy to Clipboard** - Generated links are automatically copied for easy sharing
- **Link History** - Searchable history of recently generated links with metadata
- **Content Script Integration** - Quick access overlay on any webpage

### Premium Features (Pro/Team)
- **Unlimited Templates** - Create as many templates as needed (Free: 5 templates)
- **Bulk Generation** - Generate multiple UTM links at once with CSV export
- **Google Sheets Integration** - Automatically append generated links to spreadsheets
- **Team Collaboration** - Share templates and link history with team members
- **Advanced Analytics** - Detailed reporting and campaign performance tracking

## Installation

### Development Setup

1. **Clone or download** this repository to your local machine
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** (toggle in top-right corner)
4. **Click "Load unpacked"** and select the `utm-link-generator` folder
5. The extension icon should appear in your browser toolbar

### Production Installation

1. Visit the [Chrome Web Store](https://chrome.google.com/webstore) (link coming soon)
2. Search for "UTM Link Generator"
3. Click "Add to Chrome" and confirm installation

## Usage

### Basic Usage

1. **Click the extension icon** in your browser toolbar
2. **Enter a base URL** or click auto-fill to use the current page
3. **Fill in UTM parameters**:
   - **Source**: Where traffic comes from (e.g., google, facebook, newsletter)
   - **Medium**: Marketing medium (e.g., cpc, email, social)
   - **Campaign**: Specific campaign name (e.g., summer-sale, product-launch)
   - **Term**: Paid keywords (optional)
   - **Content**: Distinguish ads or links (optional)
4. **Click "Generate UTM Link"** to create and copy the URL
5. **Paste the link** wherever you need to share it

### Using Templates

1. **Create templates** in the Options page (right-click extension icon → Options)
2. **Save common parameter combinations** for consistent campaign naming
3. **Apply templates** in the popup by selecting from the dropdown
4. **Edit or delete templates** as your campaigns evolve

### Advanced Features

- **Search History**: Use the search box to find previously generated links
- **Export Data**: Pro users can export link history to CSV
- **Google Sheets**: Automatically sync generated links to a spreadsheet
- **Bulk Generation**: Create multiple UTM links from a list of URLs

## Technical Architecture

### File Structure

```
utm-link-generator/
├── manifest.json              # Extension manifest (Manifest V3)
├── background/
│   ├── service-worker.js     # Background service worker
│   └── utm-engine.js         # Core UTM generation logic
├── popup/
│   ├── popup.html            # Main popup interface
│   ├── popup.js              # Popup functionality
│   └── popup.css             # Popup styling
├── options/
│   ├── options.html          # Settings and configuration page
│   ├── options.js            # Options page functionality
│   └── options.css           # Options page styling
├── content/
│   └── content-script.js     # Page integration and auto-fill
├── utils/
│   ├── storage.js            # Chrome storage wrapper
│   └── constants.js          # Configuration and constants
├── assets/
│   ├── icons/                # Extension icons (16px, 48px, 128px)
│   └── illustrations/        # Optional UI illustrations
└── README.md                 # This file
```

### Technologies Used

- **Manifest V3** - Latest Chrome extension standard
- **Vanilla JavaScript** - No external dependencies for performance
- **Chrome Storage API** - Sync and local storage for user data
- **Chrome Scripting API** - Content script injection
- **Modern CSS** - Responsive design with CSS Grid and Flexbox

### Permissions

The extension requests these permissions:
- `storage` - Save templates and settings
- `clipboardWrite` - Copy generated URLs
- `activeTab` - Read current page URL for auto-fill
- `scripting` - Inject content scripts for page integration
- `alarms` - Periodic license validation
- `notifications` - User feedback and notifications
- `identity` - OAuth for Google Sheets (Premium)

## Development

### Local Development

1. Make changes to any source files
2. Reload the extension in `chrome://extensions/`
3. Test functionality in popup, options, and content script

### Building for Production

1. **Remove console.log statements** from production code
2. **Optimize images** and compress assets
3. **Update version number** in `manifest.json`
4. **Test thoroughly** across different websites and scenarios
5. **Package for Chrome Web Store** submission

### Testing

#### Manual Testing Checklist

- [ ] Extension installs without errors
- [ ] Popup opens and displays correctly
- [ ] UTM generation works with all parameter combinations
- [ ] Templates can be created, edited, and deleted
- [ ] Auto-fill detects page context correctly
- [ ] Settings persist across browser sessions
- [ ] Content script overlay appears on web pages
- [ ] History tracking and search functionality
- [ ] Premium features are properly gated
- [ ] License activation flow works

#### Cross-browser Testing

- [ ] Chrome 88+ (primary target)
- [ ] Edge Chromium
- [ ] Brave Browser
- [ ] Other Chromium-based browsers

### Code Style

- Use modern JavaScript (ES2020+)
- Follow consistent naming conventions
- Include JSDoc comments for functions
- Handle errors gracefully with try/catch
- Use async/await for Promise-based operations
- Maintain separation of concerns between components

## Data Storage

### Chrome Storage Schema

```javascript
{
  // Sync storage (small data, synced across devices)
  templates: [...],           // UTM templates
  settings: {...},            // User preferences
  integrations: {...},        // Third-party integrations
  isPremium: boolean,         // Premium status
  licenseKey: string,         // License key
  schemaVersion: number,      // For data migration
  
  // Local storage (larger data, device-specific)
  history: [...]              // Generated link history
}
```

### Data Migration

The extension includes automatic data migration when the schema version changes. User data is preserved during updates.

## Privacy & Security

- **Local Data Only**: All user data is stored locally in Chrome storage
- **No Analytics**: Extension doesn't collect usage analytics
- **No External Requests**: Only makes requests for license validation and Google Sheets integration (with user consent)
- **Secure Storage**: License keys are encrypted in local storage
- **Minimal Permissions**: Requests only necessary permissions with clear explanations

## Freemium Model

### Free Tier
- Basic UTM generation
- Up to 5 templates
- 50 history entries
- Manual copy/paste workflow

### Pro Tier ($9.99/month)
- Unlimited templates
- Bulk generation with CSV export
- Google Sheets integration
- Unlimited history
- Priority support

### Team Tier ($29.99/month)
- All Pro features
- Team template sharing
- Shared link history
- Admin controls
- Advanced reporting

## Support

- **Documentation**: [Link to docs]
- **Feature Requests**: [GitHub Issues]
- **Bug Reports**: [GitHub Issues]
- **Email Support**: support@utmgenerator.com

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Copyright © 2024 UTM Link Generator. All rights reserved.

This software is proprietary. The source code is provided for educational and development purposes only.

## Changelog

### Version 1.0.0
- Initial release
- Core UTM generation functionality
- Template system
- History tracking
- Premium feature gating
- Google Sheets integration (Premium)
- Bulk generation (Premium)

## Roadmap

### Version 1.1.0
- QR code generation for UTM links
- Social media platform integrations
- A/B testing UTM variants
- Campaign performance analytics

### Version 1.2.0
- Team collaboration features
- Advanced template variables
- Webhook integrations
- API access for enterprise users

## Chrome Web Store Assets

When publishing to Chrome Web Store, ensure you have:

- [ ] 128x128 icon for store listing
- [ ] Screenshots showing key features
- [ ] Detailed description with feature list
- [ ] Privacy policy URL
- [ ] Support contact information
- [ ] Promotional tile images (440x280, 920x680, 1400x560)

## Performance Optimization

- Minimal memory footprint (<10MB)
- Fast popup load time (<100ms)
- Efficient storage operations
- Lazy loading of non-critical features
- Debounced user input handling

---

**Need help?** Check our [FAQ](https://utmgenerator.com/faq) or contact support at support@utmgenerator.com
