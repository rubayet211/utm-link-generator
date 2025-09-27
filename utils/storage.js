// Constants will be available via importScripts

/**
 * Storage utility class for Chrome extension storage operations
 */
class StorageManager {
  constructor() {
    this.sync = chrome.storage.sync;
    this.local = chrome.storage.local;
  }

  /**
   * Initialize storage with default values and migrate if needed
   */
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

  /**
   * Migrate storage data between schema versions
   */
  async migrate(fromVersion) {
    console.log(`Migrating storage from version ${fromVersion} to ${SCHEMA_VERSION}`);
    
    // Add migration logic here for future versions
    switch (fromVersion) {
      case 0:
        // Initial migration - no action needed
        break;
      default:
        console.warn('Unknown migration version:', fromVersion);
    }
  }

  /**
   * Generic get method
   */
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

  /**
   * Generic set method
   */
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

  /**
   * Get all storage data
   */
  async getAll(useLocal = false) {
    try {
      const storage = useLocal ? this.local : this.sync;
      return await storage.get();
    } catch (error) {
      console.error('Storage getAll error:', error);
      return {};
    }
  }

  /**
   * Clear all storage data
   */
  async clear(useLocal = false) {
    try {
      const storage = useLocal ? this.local : this.sync;
      await storage.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }

  /**
   * Remove specific key
   */
  async remove(key, useLocal = false) {
    try {
      const storage = useLocal ? this.local : this.sync;
      await storage.remove(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  // Specific getters and setters for typed data

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

  async updateTemplate(templateId, updates) {
    const templates = await this.getTemplates();
    const index = templates.findIndex(t => t.id === templateId);
    if (index !== -1) {
      templates[index] = { ...templates[index], ...updates };
      return await this.setTemplates(templates);
    }
    return false;
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
    
    // Add to beginning of array
    history.unshift(entry);
    
    // Enforce free tier limit
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

  /**
   * Export all data for backup
   */
  async exportData() {
    const data = await this.getAll();
    const localData = await this.getAll(true);
    return {
      sync: data,
      local: localData,
      exportedAt: new Date().toISOString()
    };
  }

  /**
   * Import data from backup
   */
  async importData(data) {
    try {
      if (data.sync) {
        await this.sync.clear();
        await this.sync.set(data.sync);
      }
      if (data.local) {
        await this.local.clear();
        await this.local.set(data.local);
      }
      return true;
    } catch (error) {
      console.error('Import data failed:', error);
      return false;
    }
  }
}

// Create singleton instance
const storage = new StorageManager();
