/**
 * Background Service Worker for UTM Link Generator
 * Handles message routing, license validation, and premium feature gating
 */

// Import external scripts using importScripts
importScripts('utm-engine.js');
importScripts('../utils/storage.js');
importScripts('../utils/constants.js');

// Initialize extension on startup
chrome.runtime.onStartup.addListener(async () => {
  await initializeExtension();
});

chrome.runtime.onInstalled.addListener(async (details) => {
  await initializeExtension();
  
  if (details.reason === 'install') {
    // First time installation
    chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
  }
});

/**
 * Initialize extension storage and settings
 */
async function initializeExtension() {
  try {
    await storage.initialize();
    console.log('UTM Link Generator initialized successfully');
  } catch (error) {
    console.error('Extension initialization failed:', error);
  }
}

/**
 * Message handling between popup, content script, and options
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender, sendResponse);
  return true; // Keep message channel open for async response
});

/**
 * Main message handler
 */
async function handleMessage(message, sender, sendResponse) {
  try {
    switch (message.type) {
      case MESSAGE_TYPES.GENERATE_UTM:
        await handleGenerateUTM(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.SAVE_TEMPLATE:
        await handleSaveTemplate(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.DELETE_TEMPLATE:
        await handleDeleteTemplate(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.GET_HISTORY:
        await handleGetHistory(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.CLEAR_HISTORY:
        await handleClearHistory(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.VALIDATE_LICENSE:
        await handleValidateLicense(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.UPDATE_SETTINGS:
        await handleUpdateSettings(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.EXPORT_CSV:
        await handleExportCSV(message, sendResponse);
        break;
        
      case MESSAGE_TYPES.SYNC_SHEETS:
        await handleSyncSheets(message, sendResponse);
        break;
        
      case 'get_templates':
        await handleGetTemplates(message, sendResponse);
        break;
        
      case 'get_settings':
        await handleGetSettings(message, sendResponse);
        break;
        
      case 'get_integrations':
        await handleGetIntegrations(message, sendResponse);
        break;
        
      case 'get_premium_status':
        await handleGetPremiumStatus(message, sendResponse);
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  } catch (error) {
    console.error('Message handling error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle UTM generation request
 */
async function handleGenerateUTM(message, sendResponse) {
  try {
    const { baseUrl, utmParams, templateId, saveToHistory } = message.data;
    
    // Get user settings
    const settings = await storage.getSettings();
    
    // Generate UTM URL
    const result = utmEngine.generateUTMUrl(baseUrl, utmParams, settings);
    
    if (result.success && saveToHistory) {
      // Save to history
      await storage.addToHistory({
        url: baseUrl,
        utmUrl: result.url,
        templateId: templateId || null,
        createdBy: 'user'
      });
      
      // Copy to clipboard if auto-copy is enabled
      if (settings.autoCopy) {
        try {
          await copyToClipboard(result.url);
          result.copiedToClipboard = true;
        } catch (error) {
          console.error('Clipboard copy failed:', error);
          result.copiedToClipboard = false;
        }
      }
    }
    
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('UTM generation error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle template save request
 */
async function handleSaveTemplate(message, sendResponse) {
  try {
    const { template } = message.data;
    const isPremium = await storage.getIsPremium();
    
    // Check premium limits
    if (!isPremium) {
      const templates = await storage.getTemplates();
      if (templates.length >= FREE_LIMITS.TEMPLATES) {
        sendResponse({
          success: false,
          error: 'Free tier limited to 5 templates. Upgrade to Pro for unlimited templates.',
          requiresPremium: true
        });
        return;
      }
    }
    
    const success = await storage.addTemplate(template);
    sendResponse({ success, data: { template } });
  } catch (error) {
    console.error('Template save error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle template deletion
 */
async function handleDeleteTemplate(message, sendResponse) {
  try {
    const { templateId } = message.data;
    const success = await storage.deleteTemplate(templateId);
    sendResponse({ success });
  } catch (error) {
    console.error('Template delete error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get templates request
 */
async function handleGetTemplates(message, sendResponse) {
  try {
    const templates = await storage.getTemplates();
    sendResponse({ success: true, data: { templates } });
  } catch (error) {
    console.error('Get templates error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get settings request
 */
async function handleGetSettings(message, sendResponse) {
  try {
    const settings = await storage.getSettings();
    sendResponse({ success: true, data: { settings } });
  } catch (error) {
    console.error('Get settings error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get integrations request
 */
async function handleGetIntegrations(message, sendResponse) {
  try {
    const integrations = await storage.getIntegrations();
    sendResponse({ success: true, data: { integrations } });
  } catch (error) {
    console.error('Get integrations error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle get premium status request
 */
async function handleGetPremiumStatus(message, sendResponse) {
  try {
    const isPremium = await storage.getIsPremium();
    sendResponse({ success: true, data: { isPremium } });
  } catch (error) {
    console.error('Get premium status error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle history retrieval
 */
async function handleGetHistory(message, sendResponse) {
  try {
    const { searchQuery, limit } = message.data || {};
    
    let history;
    if (searchQuery) {
      history = await storage.searchHistory(searchQuery);
    } else {
      history = await storage.getHistory();
    }
    
    if (limit) {
      history = history.slice(0, limit);
    }
    
    sendResponse({ success: true, data: { history } });
  } catch (error) {
    console.error('Get history error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle history clearing
 */
async function handleClearHistory(message, sendResponse) {
  try {
    const success = await storage.clearHistory();
    sendResponse({ success });
  } catch (error) {
    console.error('Clear history error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle license validation
 */
async function handleValidateLicense(message, sendResponse) {
  try {
    const { licenseKey } = message.data;
    
    // Validate license with remote server
    const isValid = await validateLicenseKey(licenseKey);
    
    if (isValid) {
      await storage.setLicenseKey(licenseKey);
      await storage.setIsPremium(true);
      
      // Show success notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('assets/icons/icon.svg'),
        title: 'License Activated',
        message: 'Premium features are now available!'
      });
    }
    
    sendResponse({ success: true, data: { isValid, isPremium: isValid } });
  } catch (error) {
    console.error('License validation error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle settings update
 */
async function handleUpdateSettings(message, sendResponse) {
  try {
    const { settings } = message.data;
    const success = await storage.setSettings(settings);
    sendResponse({ success, data: { settings } });
  } catch (error) {
    console.error('Update settings error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle CSV export
 */
async function handleExportCSV(message, sendResponse) {
  try {
    const isPremium = await storage.getIsPremium();
    
    if (!isPremium) {
      sendResponse({
        success: false,
        error: 'CSV export requires Pro subscription',
        requiresPremium: true
      });
      return;
    }
    
    const history = await storage.getHistory();
    const csvContent = utmEngine.exportToCSV(history);
    
    sendResponse({ success: true, data: { csvContent } });
  } catch (error) {
    console.error('CSV export error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle Google Sheets sync
 */
async function handleSyncSheets(message, sendResponse) {
  try {
    const isPremium = await storage.getIsPremium();
    
    if (!isPremium) {
      sendResponse({
        success: false,
        error: 'Google Sheets integration requires Pro subscription',
        requiresPremium: true
      });
      return;
    }
    
    const { sheetId, data } = message.data;
    const result = await syncToGoogleSheets(sheetId, data);
    
    // Update last sync time
    const integrations = await storage.getIntegrations();
    integrations.googleSheets.lastSync = Date.now();
    await storage.setIntegrations(integrations);
    
    sendResponse({ success: true, data: result });
  } catch (error) {
    console.error('Sheets sync error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Validate license key with remote server
 */
async function validateLicenseKey(licenseKey) {
  // Mock validation - replace with actual API call
  return new Promise((resolve) => {
    setTimeout(() => {
      // Simple validation logic for demo
      resolve(licenseKey && licenseKey.length >= 20);
    }, 1000);
  });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
  try {
    // Get active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Execute script to copy to clipboard
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (textToCopy) => {
        navigator.clipboard.writeText(textToCopy);
      },
      args: [text]
    });
  } catch (error) {
    console.error('Clipboard copy failed:', error);
    throw error;
  }
}

/**
 * Sync data to Google Sheets
 */
async function syncToGoogleSheets(sheetId, data) {
  // Mock implementation - replace with actual Sheets API integration
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        rowsAdded: data.length,
        sheetId: sheetId,
        syncedAt: new Date().toISOString()
      });
    }, 2000);
  });
}

/**
 * Check if feature requires premium
 */
async function requiresPremiumFeature(feature) {
  const isPremium = await storage.getIsPremium();
  
  if (!isPremium && Object.values(PREMIUM_FEATURES).includes(feature)) {
    return true;
  }
  
  return false;
}

/**
 * Show premium upgrade notification
 */
function showPremiumNotification(feature) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'assets/icons/icon-48.png',
    title: 'Premium Feature',
    message: `${feature} requires Pro subscription. Upgrade to unlock all features!`
  });
}

/**
 * Handle alarm events for scheduled tasks
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case 'license-check':
      await performLicenseCheck();
      break;
    case 'cleanup-history':
      await cleanupOldHistory();
      break;
  }
});

/**
 * Set up periodic alarms
 */
chrome.alarms.create('license-check', { 
  delayInMinutes: 60 * 24, // Check daily
  periodInMinutes: 60 * 24 
});

chrome.alarms.create('cleanup-history', { 
  delayInMinutes: 60 * 24 * 7, // Weekly cleanup
  periodInMinutes: 60 * 24 * 7 
});

/**
 * Perform periodic license validation
 */
async function performLicenseCheck() {
  try {
    const licenseKey = await storage.getLicenseKey();
    if (licenseKey) {
      try {
        const isValid = await validateLicenseKey(licenseKey);
        await storage.setIsPremium(isValid);
      } catch (error) {
        console.error('License check failed:', error);
      }
    }
  } catch (error) {
    console.error('License check failed:', error);
  }
}

/**
 * Clean up old history entries
 */
async function cleanupOldHistory() {
  try {
    const isPremium = await storage.getIsPremium();
    
    if (!isPremium) {
      const history = await storage.getHistory();
      if (history.length > FREE_LIMITS.HISTORY_SIZE) {
        const trimmed = history.slice(0, FREE_LIMITS.HISTORY_SIZE);
        await storage.setHistory(trimmed);
      }
    }
  } catch (error) {
    console.error('History cleanup failed:', error);
  }
}

// Handle extension context invalidation
chrome.runtime.onSuspend.addListener(() => {
  console.log('Extension context suspended');
});

// Initialize on script load
initializeExtension();
