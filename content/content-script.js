/**
 * UTM Link Generator Content Script
 * Provides page context integration and auto-fill functionality
 */

class UTMContentScript {
  constructor() {
    this.pageInfo = null;
    this.initialized = false;
    this.overlayVisible = false;
    
    this.init();
  }

  /**
   * Initialize content script
   */
  init() {
    if (this.initialized) return;
    
    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  /**
   * Setup content script functionality
   */
  setup() {
    try {
      this.collectPageInfo();
      this.setupMessageListeners();
      this.setupPageObserver();
      this.initialized = true;
      
      console.log('UTM Link Generator content script initialized');
    } catch (error) {
      console.error('Content script setup failed:', error);
    }
  }

  /**
   * Collect page information for auto-fill
   */
  collectPageInfo() {
    this.pageInfo = {
      url: this.cleanUrl(window.location.href),
      title: document.title,
      referrer: document.referrer,
      hostname: window.location.hostname,
      pathname: window.location.pathname,
      meta: this.extractMetaTags(),
      openGraph: this.extractOpenGraphTags(),
      timestamp: Date.now()
    };
  }

  /**
   * Clean URL by removing existing UTM parameters
   */
  cleanUrl(url) {
    try {
      const urlObj = new URL(url);
      
      // Remove existing UTM parameters
      const utmParams = [
        'utm_source', 'utm_medium', 'utm_campaign', 
        'utm_term', 'utm_content', 'utm_id'
      ];
      
      utmParams.forEach(param => {
        urlObj.searchParams.delete(param);
      });
      
      return urlObj.toString();
    } catch (error) {
      return url;
    }
  }

  /**
   * Extract relevant meta tags
   */
  extractMetaTags() {
    const meta = {};
    
    const metaTags = [
      'description',
      'keywords',
      'author',
      'theme-color',
      'application-name'
    ];
    
    metaTags.forEach(name => {
      const element = document.querySelector(`meta[name="${name}"]`);
      if (element) {
        meta[name] = element.getAttribute('content');
      }
    });
    
    return meta;
  }

  /**
   * Extract Open Graph tags
   */
  extractOpenGraphTags() {
    const og = {};
    
    const ogTags = document.querySelectorAll('meta[property^="og:"]');
    ogTags.forEach(tag => {
      const property = tag.getAttribute('property').replace('og:', '');
      const content = tag.getAttribute('content');
      if (content) {
        og[property] = content;
      }
    });
    
    return og;
  }

  /**
   * Setup message listeners for communication with popup/background
   */
  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
  }

  /**
   * Handle messages from popup or background script
   */
  async handleMessage(message, sender, sendResponse) {
    try {
      switch (message.type) {
        case 'get_page_info':
          this.collectPageInfo(); // Refresh page info
          sendResponse({ 
            success: true, 
            data: { pageInfo: this.pageInfo } 
          });
          break;
          
        case 'auto_detect_utm':
          const detected = this.autoDetectUTMParams();
          sendResponse({ 
            success: true, 
            data: { detected } 
          });
          break;
          
        case 'inject_overlay':
          this.showQuickAccessOverlay(message.data);
          sendResponse({ success: true });
          break;
          
        case 'copy_to_clipboard':
          await this.copyToClipboard(message.data.text);
          sendResponse({ success: true });
          break;
          
        case 'paste_to_input':
          this.pasteToActiveInput(message.data.text);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Content script message error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Auto-detect UTM parameters from page context
   */
  autoDetectUTMParams() {
    const detected = {};
    
    // Detect from current URL domain
    const domainPatterns = {
      'facebook.com': { source: 'facebook', medium: 'social' },
      'twitter.com': { source: 'twitter', medium: 'social' },
      'x.com': { source: 'twitter', medium: 'social' },
      'linkedin.com': { source: 'linkedin', medium: 'social' },
      'instagram.com': { source: 'instagram', medium: 'social' },
      'youtube.com': { source: 'youtube', medium: 'video' },
      'gmail.com': { source: 'email', medium: 'email' },
      'google.com': { source: 'google', medium: 'organic' },
      'bing.com': { source: 'bing', medium: 'organic' },
      'reddit.com': { source: 'reddit', medium: 'social' },
      'pinterest.com': { source: 'pinterest', medium: 'social' }
    };
    
    const hostname = this.pageInfo.hostname.toLowerCase();
    
    for (const [pattern, params] of Object.entries(domainPatterns)) {
      if (hostname.includes(pattern)) {
        detected.source = params.source;
        detected.medium = params.medium;
        break;
      }
    }
    
    // Detect from referrer
    if (this.pageInfo.referrer && !detected.source) {
      try {
        const referrerUrl = new URL(this.pageInfo.referrer);
        const referrerHostname = referrerUrl.hostname.toLowerCase();
        
        for (const [pattern, params] of Object.entries(domainPatterns)) {
          if (referrerHostname.includes(pattern)) {
            detected.source = params.source;
            detected.medium = params.medium;
            break;
          }
        }
        
        // Fallback to domain name
        if (!detected.source) {
          detected.source = referrerHostname.replace('www.', '').split('.')[0];
          detected.medium = 'referral';
        }
      } catch (error) {
        // Invalid referrer URL
      }
    }
    
    // Detect campaign from page title or meta
    if (!detected.campaign) {
      detected.campaign = this.generateCampaignFromContent();
    }
    
    // Detect content from page path
    if (this.pageInfo.pathname && this.pageInfo.pathname !== '/') {
      detected.content = this.pageInfo.pathname
        .split('/')
        .filter(segment => segment)
        .slice(-1)[0]
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase();
    }
    
    return detected;
  }

  /**
   * Generate campaign name from page content
   */
  generateCampaignFromContent() {
    let campaign = '';
    
    // Try page title
    if (this.pageInfo.title) {
      campaign = this.pageInfo.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join('-');
    }
    
    // Try Open Graph title
    if (!campaign && this.pageInfo.openGraph.title) {
      campaign = this.pageInfo.openGraph.title
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join('-');
    }
    
    // Try meta description
    if (!campaign && this.pageInfo.meta.description) {
      campaign = this.pageInfo.meta.description
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .join('-');
    }
    
    // Fallback to hostname and date
    if (!campaign) {
      const hostname = this.pageInfo.hostname.replace('www.', '').split('.')[0];
      const date = new Date().toISOString().split('T')[0];
      campaign = `${hostname}-${date}`;
    }
    
    return campaign;
  }

  /**
   * Show quick access overlay for UTM generation
   */
  showQuickAccessOverlay(data = {}) {
    if (this.overlayVisible) {
      this.hideQuickAccessOverlay();
      return;
    }
    
    const overlay = this.createOverlay(data);
    document.body.appendChild(overlay);
    this.overlayVisible = true;
    
    // Auto-hide after 10 seconds
    setTimeout(() => {
      this.hideQuickAccessOverlay();
    }, 10000);
  }

  /**
   * Create overlay element
   */
  createOverlay(data) {
    const overlay = document.createElement('div');
    overlay.id = 'utm-generator-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      font-size: 14px;
      border: 1px solid #e5e7eb;
      animation: utm-slide-in 0.3s ease;
    `;
    
    // Add slide-in animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes utm-slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    overlay.innerHTML = `
      <div style="padding: 16px; border-bottom: 1px solid #e5e7eb;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="width: 20px; height: 20px; background: #2563eb; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 12px; font-weight: bold;">U</span>
            </div>
            <span style="font-weight: 600; color: #1f2937;">UTM Generator</span>
          </div>
          <button id="utm-overlay-close" style="background: none; border: none; color: #6b7280; cursor: pointer; padding: 4px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <p style="color: #6b7280; font-size: 12px; margin: 0;">
          Quick UTM link generation for this page
        </p>
      </div>
      
      <div style="padding: 16px;">
        <div style="margin-bottom: 12px;">
          <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">
            Base URL
          </label>
          <input 
            id="utm-overlay-url" 
            type="text" 
            value="${this.pageInfo.url}"
            style="width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;"
            readonly
          >
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
          <div>
            <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">
              Source
            </label>
            <input 
              id="utm-overlay-source" 
              type="text" 
              placeholder="facebook"
              style="width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;"
            >
          </div>
          <div>
            <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">
              Medium
            </label>
            <input 
              id="utm-overlay-medium" 
              type="text" 
              placeholder="social"
              style="width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;"
            >
          </div>
        </div>
        
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 12px; font-weight: 500; color: #374151; margin-bottom: 4px;">
            Campaign
          </label>
          <input 
            id="utm-overlay-campaign" 
            type="text" 
            placeholder="summer-campaign"
            style="width: 100%; padding: 8px 10px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px;"
          >
        </div>
        
        <div style="display: flex; gap: 8px;">
          <button 
            id="utm-overlay-autofill"
            style="flex: 1; padding: 8px 12px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 6px; font-size: 12px; cursor: pointer; color: #374151;"
          >
            Auto-fill
          </button>
          <button 
            id="utm-overlay-generate"
            style="flex: 2; padding: 8px 12px; background: #2563eb; border: none; border-radius: 6px; color: white; font-size: 12px; cursor: pointer; font-weight: 500;"
          >
            Generate & Copy
          </button>
        </div>
        
        <div id="utm-overlay-result" style="margin-top: 12px; display: none;">
          <div style="background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 8px;">
            <div style="font-size: 10px; color: #0f172a; font-family: Monaco, monospace; word-break: break-all;" id="utm-overlay-url-result"></div>
            <div style="font-size: 10px; color: #059669; margin-top: 4px; font-weight: 500;">
              ✓ Copied to clipboard
            </div>
          </div>
        </div>
      </div>
    `;
    
    this.setupOverlayEventListeners(overlay);
    return overlay;
  }

  /**
   * Setup event listeners for overlay
   */
  setupOverlayEventListeners(overlay) {
    // Close button
    overlay.querySelector('#utm-overlay-close').addEventListener('click', () => {
      this.hideQuickAccessOverlay();
    });
    
    // Auto-fill button
    overlay.querySelector('#utm-overlay-autofill').addEventListener('click', () => {
      const detected = this.autoDetectUTMParams();
      
      if (detected.source) {
        overlay.querySelector('#utm-overlay-source').value = detected.source;
      }
      if (detected.medium) {
        overlay.querySelector('#utm-overlay-medium').value = detected.medium;
      }
      if (detected.campaign) {
        overlay.querySelector('#utm-overlay-campaign').value = detected.campaign;
      }
    });
    
    // Generate button
    overlay.querySelector('#utm-overlay-generate').addEventListener('click', async () => {
      const baseUrl = overlay.querySelector('#utm-overlay-url').value;
      const source = overlay.querySelector('#utm-overlay-source').value.trim();
      const medium = overlay.querySelector('#utm-overlay-medium').value.trim();
      const campaign = overlay.querySelector('#utm-overlay-campaign').value.trim();
      
      if (!source || !medium || !campaign) {
        this.showOverlayMessage('Please fill in all required fields', 'error');
        return;
      }
      
      const utmUrl = this.buildUTMUrl(baseUrl, { source, medium, campaign });
      
      try {
        await this.copyToClipboard(utmUrl);
        
        const resultDiv = overlay.querySelector('#utm-overlay-result');
        const urlResult = overlay.querySelector('#utm-overlay-url-result');
        
        urlResult.textContent = utmUrl;
        resultDiv.style.display = 'block';
        
        // Auto-hide overlay after 3 seconds
        setTimeout(() => {
          this.hideQuickAccessOverlay();
        }, 3000);
        
      } catch (error) {
        this.showOverlayMessage('Failed to copy to clipboard', 'error');
      }
    });
    
    // Click outside to close
    document.addEventListener('click', (e) => {
      if (!overlay.contains(e.target)) {
        this.hideQuickAccessOverlay();
      }
    }, { once: true });
  }

  /**
   * Build UTM URL from parameters
   */
  buildUTMUrl(baseUrl, params) {
    try {
      const url = new URL(baseUrl);
      
      if (params.source) url.searchParams.set('utm_source', params.source);
      if (params.medium) url.searchParams.set('utm_medium', params.medium);
      if (params.campaign) url.searchParams.set('utm_campaign', params.campaign);
      if (params.term) url.searchParams.set('utm_term', params.term);
      if (params.content) url.searchParams.set('utm_content', params.content);
      
      return url.toString();
    } catch (error) {
      return baseUrl;
    }
  }

  /**
   * Show message in overlay
   */
  showOverlayMessage(message, type = 'info') {
    const overlay = document.getElementById('utm-generator-overlay');
    if (!overlay) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: ${type === 'error' ? '#fef2f2' : '#f0f9ff'};
      border: 1px solid ${type === 'error' ? '#fecaca' : '#bae6fd'};
      color: ${type === 'error' ? '#991b1b' : '#1e40af'};
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      z-index: 10001;
    `;
    messageDiv.textContent = message;
    
    overlay.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  /**
   * Hide quick access overlay
   */
  hideQuickAccessOverlay() {
    const overlay = document.getElementById('utm-generator-overlay');
    if (overlay) {
      overlay.remove();
      this.overlayVisible = false;
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
    } catch (error) {
      console.error('Clipboard copy failed:', error);
      throw error;
    }
  }

  /**
   * Paste text to active input field
   */
  pasteToActiveInput(text) {
    const activeElement = document.activeElement;
    
    if (activeElement && 
        (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') &&
        !activeElement.readOnly && !activeElement.disabled) {
      
      const start = activeElement.selectionStart;
      const end = activeElement.selectionEnd;
      const value = activeElement.value;
      
      activeElement.value = value.substring(0, start) + text + value.substring(end);
      activeElement.selectionStart = activeElement.selectionEnd = start + text.length;
      
      // Trigger change event
      activeElement.dispatchEvent(new Event('input', { bubbles: true }));
      activeElement.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  /**
   * Setup page observer for dynamic content
   */
  setupPageObserver() {
    // Watch for URL changes (SPAs)
    let lastUrl = window.location.href;
    
    const observer = new MutationObserver(() => {
      if (window.location.href !== lastUrl) {
        lastUrl = window.location.href;
        this.collectPageInfo();
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Listen for popstate events
    window.addEventListener('popstate', () => {
      setTimeout(() => {
        this.collectPageInfo();
      }, 100);
    });
    
    // Listen for pushstate/replacestate events
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = function(...args) {
      originalPushState.apply(this, args);
      setTimeout(() => {
        window.utmContentScript?.collectPageInfo();
      }, 100);
    };
    
    history.replaceState = function(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(() => {
        window.utmContentScript?.collectPageInfo();
      }, 100);
    };
  }

  /**
   * Check if page is suitable for UTM generation
   */
  isPageSuitable() {
    // Skip if URL is not http/https
    if (!window.location.href.startsWith('http')) {
      return false;
    }
    
    // Skip extension pages
    if (window.location.href.startsWith('chrome-extension://')) {
      return false;
    }
    
    // Skip if in iframe
    if (window !== window.top) {
      return false;
    }
    
    return true;
  }
}

// Initialize content script only if page is suitable
if (window.location.href.startsWith('http')) {
  window.utmContentScript = new UTMContentScript();
}
