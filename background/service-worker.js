/**
 * Background Service Worker for UTM Link Generator
 * Handles message routing, license validation, and premium feature gating
 */

// Define constants inline to avoid importScripts path issues
const MESSAGE_TYPES = {
  GENERATE_UTM: 'generate_utm',
  SAVE_TEMPLATE: 'save_template',
  DELETE_TEMPLATE: 'delete_template',
  GET_HISTORY: 'get_history',
  CLEAR_HISTORY: 'clear_history',
  VALIDATE_LICENSE: 'validate_license',
  UPDATE_SETTINGS: 'update_settings',
  EXPORT_CSV: 'export_csv',
  SYNC_SHEETS: 'sync_sheets'
};

const FREE_LIMITS = {
  HISTORY_SIZE: 50,
  TEMPLATES: 5,
  BULK_GENERATION: 10
};

const PREMIUM_FEATURES = {
  UNLIMITED_TEMPLATES: 'unlimited_templates',
  BULK_GENERATION: 'bulk_generation',
  CSV_EXPORT: 'csv_export',
  GOOGLE_SHEETS: 'google_sheets',
  TEAM_SHARING: 'team_sharing'
};

// Storage configuration
const STORAGE_KEYS = {
  TEMPLATES: 'templates',
  HISTORY: 'history',
  SETTINGS: 'settings',
  INTEGRATIONS: 'integrations',
  IS_PREMIUM: 'isPremium',
  LICENSE_KEY: 'licenseKey',
  SCHEMA_VERSION: 'schemaVersion'
};

const SCHEMA_VERSION = 1;

const DEFAULT_SETTINGS = {
  defaultSource: '',
  defaultMedium: '',
  lowercaseEnforced: true,
  hyphenateSpaces: true,
  autoCopy: true
};

const DEFAULT_TEMPLATES = [
  {
    id: 'email-campaign',
    name: 'Email Campaign',
    fields: {
      source: 'email',
      medium: 'email',
      campaignPattern: 'newsletter-{date}'
    },
    createdAt: Date.now()
  },
  {
    id: 'social-media',
    name: 'Social Media',
    fields: {
      source: 'social',
      medium: 'social',
      campaignPattern: 'social-{platform}'
    },
    createdAt: Date.now()
  },
  {
    id: 'paid-search',
    name: 'Paid Search',
    fields: {
      source: 'google',
      medium: 'cpc',
      campaignPattern: 'search-{keyword}'
    },
    createdAt: Date.now()
  }
];

// UTM Parameters
const UTM_PARAMS = {
  SOURCE: 'utm_source',
  MEDIUM: 'utm_medium',
  CAMPAIGN: 'utm_campaign',
  TERM: 'utm_term',
  CONTENT: 'utm_content'
};

const VALIDATION_RULES = {
  REQUIRED_FIELDS: ['source', 'medium', 'campaign'],
  FORBIDDEN_CHARS: /[<>"`'&\s]/g,
  MAX_LENGTH: 100,
  MIN_LENGTH: 1
};

// Simplified Storage Manager
class StorageManager {
  constructor() {
    this.sync = chrome.storage.sync;
    this.local = chrome.storage.local;
  }

  async initialize() {
    try {
      const data = await this.getAll();
      
      // Check if migration is needed
      const currentVersion = data[STORAGE_KEYS.SCHEMA_VERSION] || 0;
      if (currentVersion < SCHEMA_VERSION) {
        await this.migrate(currentVersion);
      }

      // Set defaults if not present
      if (!data[STORAGE_KEYS.SETTINGS]) {
        await this.setSettings(DEFAULT_SETTINGS);
      }

      if (!data[STORAGE_KEYS.TEMPLATES] || data[STORAGE_KEYS.TEMPLATES].length === 0) {
        await this.setTemplates(DEFAULT_TEMPLATES);
      }

      if (!data[STORAGE_KEYS.HISTORY]) {
        await this.setHistory([]);
      }

      if (!data[STORAGE_KEYS.INTEGRATIONS]) {
        await this.setIntegrations({
          googleSheets: { enabled: false, sheetId: '', lastSync: null }
        });
      }

      // Set schema version
      await this.set(STORAGE_KEYS.SCHEMA_VERSION, SCHEMA_VERSION);
    } catch (error) {
      console.error('Storage initialization failed:', error);
      throw error;
    }
  }

  async migrate(fromVersion) {
    console.log(`Migrating storage from version ${fromVersion} to ${SCHEMA_VERSION}`);
  }

  async get(key, useLocal = false) {
    try {
      const storage = useLocal ? this.local : this.sync;
      const result = await storage.get(key);
      return result[key];
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  async set(key, value, useLocal = false) {
    try {
      const storage = useLocal ? this.local : this.sync;
      await storage.set({ [key]: value });
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  async getAll(useLocal = false) {
    try {
      const storage = useLocal ? this.local : this.sync;
      return await storage.get();
    } catch (error) {
      console.error('Storage getAll error:', error);
      return {};
    }
  }

  async getSettings() {
    return await this.get(STORAGE_KEYS.SETTINGS) || DEFAULT_SETTINGS;
  }

  async setSettings(settings) {
    return await this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  async getTemplates() {
    return await this.get(STORAGE_KEYS.TEMPLATES) || [];
  }

  async setTemplates(templates) {
    return await this.set(STORAGE_KEYS.TEMPLATES, templates);
  }

  async addTemplate(template) {
    const templates = await this.getTemplates();
    template.id = template.id || `template_${Date.now()}`;
    template.createdAt = Date.now();
    templates.push(template);
    return await this.setTemplates(templates);
  }

  async deleteTemplate(templateId) {
    const templates = await this.getTemplates();
    const filtered = templates.filter(t => t.id !== templateId);
    return await this.setTemplates(filtered);
  }

  async getHistory() {
    return await this.get(STORAGE_KEYS.HISTORY, true) || [];
  }

  async setHistory(history) {
    return await this.set(STORAGE_KEYS.HISTORY, history, true);
  }

  async addToHistory(entry) {
    const history = await this.getHistory();
    entry.id = entry.id || `history_${Date.now()}`;
    entry.createdAt = Date.now();
    
    history.unshift(entry);
    
    const isPremium = await this.getIsPremium();
    if (!isPremium && history.length > 50) {
      history.splice(50);
    }
    
    return await this.setHistory(history);
  }

  async clearHistory() {
    return await this.setHistory([]);
  }

  async searchHistory(query) {
    const history = await this.getHistory();
    const lowerQuery = query.toLowerCase();
    return history.filter(entry => 
      entry.url.toLowerCase().includes(lowerQuery) ||
      entry.utmUrl.toLowerCase().includes(lowerQuery) ||
      (entry.templateId && entry.templateId.toLowerCase().includes(lowerQuery))
    );
  }

  async getIntegrations() {
    return await this.get(STORAGE_KEYS.INTEGRATIONS) || {
      googleSheets: { enabled: false, sheetId: '', lastSync: null }
    };
  }

  async setIntegrations(integrations) {
    return await this.set(STORAGE_KEYS.INTEGRATIONS, integrations);
  }

  async getIsPremium() {
    return await this.get(STORAGE_KEYS.IS_PREMIUM) || false;
  }

  async setIsPremium(isPremium) {
    return await this.set(STORAGE_KEYS.IS_PREMIUM, isPremium);
  }

  async getLicenseKey() {
    return await this.get(STORAGE_KEYS.LICENSE_KEY) || '';
  }

  async setLicenseKey(licenseKey) {
    return await this.set(STORAGE_KEYS.LICENSE_KEY, licenseKey);
  }
}

// Simplified UTM Engine
class UTMEngine {
  constructor() {
    this.validationRules = VALIDATION_RULES;
  }

  generateUTMUrl(baseUrl, utmParams, options = {}) {
    try {
      const validation = this.validateInputs(baseUrl, utmParams, options);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          url: null
        };
      }

      const cleanParams = this.processParameters(utmParams, options);
      const url = this.buildUrl(baseUrl, cleanParams);
      
      return {
        success: true,
        url: url,
        errors: [],
        params: cleanParams
      };
    } catch (error) {
      return {
        success: false,
        errors: [`UTM generation failed: ${error.message}`],
        url: null
      };
    }
  }

  validateInputs(baseUrl, utmParams, options) {
    const errors = [];

    if (!baseUrl || typeof baseUrl !== 'string') {
      errors.push('Base URL is required');
    } else {
      try {
        new URL(baseUrl);
      } catch {
        errors.push('Base URL is not valid');
      }
    }

    this.validationRules.REQUIRED_FIELDS.forEach(field => {
      const paramKey = this.getUTMParamKey(field);
      if (!utmParams[paramKey] || typeof utmParams[paramKey] !== 'string') {
        errors.push(`${field} is required`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  processParameters(utmParams, options) {
    const processed = {};

    Object.entries(utmParams).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        let cleanValue = value.trim();

        if (options.lowercaseEnforced !== false) {
          cleanValue = cleanValue.toLowerCase();
        }

        if (options.hyphenateSpaces !== false) {
          cleanValue = cleanValue.replace(/\s+/g, '-');
        }

        cleanValue = cleanValue.replace(this.validationRules.FORBIDDEN_CHARS, '');
        processed[key] = encodeURIComponent(cleanValue);
      }
    });

    return processed;
  }

  buildUrl(baseUrl, utmParams) {
    const url = new URL(baseUrl);
    
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  getUTMParamKey(field) {
    const mapping = {
      source: UTM_PARAMS.SOURCE,
      medium: UTM_PARAMS.MEDIUM,
      campaign: UTM_PARAMS.CAMPAIGN,
      term: UTM_PARAMS.TERM,
      content: UTM_PARAMS.CONTENT
    };
    return mapping[field] || field;
  }

  exportToCSV(data) {
    const headers = [
      'Original URL',
      'UTM URL',
      'Source',
      'Medium',
      'Campaign',
      'Term',
      'Content',
      'Created At',
      'Template'
    ];

    const rows = data.map(item => [
      item.url || '',
      item.utmUrl || '',
      this.extractUTMParam(item.utmUrl, UTM_PARAMS.SOURCE),
      this.extractUTMParam(item.utmUrl, UTM_PARAMS.MEDIUM),
      this.extractUTMParam(item.utmUrl, UTM_PARAMS.CAMPAIGN),
      this.extractUTMParam(item.utmUrl, UTM_PARAMS.TERM),
      this.extractUTMParam(item.utmUrl, UTM_PARAMS.CONTENT),
      item.createdAt ? new Date(item.createdAt).toISOString() : '',
      item.templateId || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
      .join('\n');

    return csvContent;
  }

  extractUTMParam(url, param) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get(param) || '';
    } catch {
      return '';
    }
  }
}

// Create instances
const storage = new StorageManager();
const utmEngine = new UTMEngine();

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
      
      // Let the popup handle clipboard operations
      result.shouldCopyToClipboard = settings.autoCopy;
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

// Clipboard operations moved to popup for better security and reliability

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
