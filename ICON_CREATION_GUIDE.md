# Icon Creation Guide

## Quick Fix - Extension Now Works!

✅ **The extension manifest error has been fixed!** The extension will now load properly in Chrome with placeholder icons.

## Current Status

The extension currently uses CSS-based placeholder icons that display "UTM" text. This allows the extension to function immediately while you create proper PNG icons.

## Creating Proper Icons

### Option 1: Use the Included Icon Generator (Easiest)

1. **Open the icon generator**: Double-click `assets/icons/create-icons.html` in your browser
2. **Click "Generate Icons"** - this creates canvas-based icons
3. **Save each icon**:
   - Right-click the 16x16 canvas → "Save image as..." → `icon-16.png`
   - Right-click the 48x48 canvas → "Save image as..." → `icon-48.png`
   - Right-click the 128x128 canvas → "Save image as..." → `icon-128.png`
4. **Place files** in the `assets/icons/` directory
5. **Update manifest.json** to include icon references

### Option 2: Create Professional Icons

Use design tools like:
- **Figma** (free, web-based)
- **Adobe Illustrator**
- **Canva** (has icon templates)
- **IconJar** or **SF Symbols** (Mac)

#### Icon Specifications:
- **Sizes**: 16x16, 48x48, 128x128 pixels
- **Format**: PNG with transparent background
- **Style**: Modern, clean, represents links/URLs
- **Colors**: Primary blue (#2563EB) with white accents
- **Content**: Consider using chain link, URL, or "UTM" text

### Option 3: Convert SVG to PNG

Use the included `assets/icons/icon.svg` file:

1. **Online converters**: 
   - CloudConvert.com
   - SVG2PNG.com
   - Convertio.co

2. **Command line** (if you have ImageMagick):
   ```bash
   convert icon.svg -resize 16x16 icon-16.png
   convert icon.svg -resize 48x48 icon-48.png
   convert icon.svg -resize 128x128 icon-128.png
   ```

3. **Design tools**: Import SVG and export as PNG at required sizes

## Updating Manifest After Creating Icons

Once you have the PNG files, update `manifest.json`:

```json
{
  "action": {
    "default_popup": "popup/popup.html",
    "default_title": "UTM Link Generator",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  "icons": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  }
}
```

## Testing Icons

1. **Reload extension** in `chrome://extensions/`
2. **Check toolbar** - should show your 16px icon
3. **Check extension page** - should show your 48px icon
4. **Check Chrome Web Store** (when publishing) - uses 128px icon

## Icon Design Tips

### 16x16 Icon (Toolbar)
- Keep it simple - just "U" or a small chain link
- Ensure visibility against light and dark browser themes
- Test readability at actual size

### 48x48 Icon (Extension Management)
- Can include "UTM" text
- Add simple link/chain graphic
- Use consistent brand colors

### 128x128 Icon (Store Listing)
- Most detailed version
- Include full branding elements
- Consider adding tagline or additional graphics
- Ensure it looks good as store thumbnail

## Brand Guidelines

- **Primary Color**: #2563EB (blue)
- **Text Color**: White on blue background
- **Style**: Modern, professional, tech-focused
- **Symbol**: Chain links, URL bars, or "UTM" lettering
- **Avoid**: Complex graphics that don't scale well

---

**The extension is ready to use now with placeholder icons!** Create proper icons when you have time for a more polished look.
