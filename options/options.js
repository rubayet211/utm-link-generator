// Constants defined inline for compatibility
const MESSAGE_TYPES = {
  GENERATE_UTM: 'generate_utm',
  SAVE_TEMPLATE: 'save_template',
  DELETE_TEMPLATE: 'delete_template',
  GET_HISTORY: 'get_history',
  CLEAR_HISTORY: 'clear_history',
  VALIDATE_LICENSE: 'validate_license',
  UPDATE_SETTINGS: 'update_settings',
  EXPORT_CSV: 'export_csv',
  SYNC_SHEETS: 'sync_sheets',
  UPDATE_TEMPLATE: 'update_template'
};

/**
 * UTM Link Generator Options Page
 * Manages settings, templates, integrations, and license activation
 */

class OptionsPage {
  constructor() {
    this.currentTab = 'templates';
    this.templates = [];
    this.settings = {};
    this.integrations = {};
    this.isPremium = false;
    this.editingTemplate = null;
    
    this.init();
  }

  /**
   * Initialize options page
   */
  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.updateUI();
    this.showTab(this.currentTab);
  }

  /**
   * Load data from storage
   */
  async loadData() {
    try {
      // Load templates
      const templatesResponse = await this.sendMessage({
        type: 'get_templates'
      });
      this.templates = templatesResponse.data?.templates || [];
      
      // Load settings
      const settingsResponse = await this.sendMessage({
        type: 'get_settings'
      });
      this.settings = settingsResponse.data?.settings || {};
      
      // Load integrations
      const integrationsResponse = await this.sendMessage({
        type: 'get_integrations'
      });
      this.integrations = integrationsResponse.data?.integrations || {};
      
      // Load premium status
      const premiumResponse = await this.sendMessage({
        type: 'get_premium_status'
      });
      this.isPremium = premiumResponse.data?.isPremium || false;
      
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', (e) => {
        this.showTab(e.target.dataset.tab);
      });
    });

    // Templates tab
    document.getElementById('addTemplateBtn').addEventListener('click', () => {
      this.showTemplateModal();
    });

    // Settings tab
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
      this.saveSettings();
    });
    
    document.getElementById('resetSettingsBtn').addEventListener('click', () => {
      this.resetSettings();
    });

    // Integrations tab
    document.getElementById('connectSheetsBtn').addEventListener('click', () => {
      this.connectGoogleSheets();
    });
    
    document.getElementById('saveSheetsBtn').addEventListener('click', () => {
      this.saveSheetsConfig();
    });
    
    document.getElementById('testSheetsBtn').addEventListener('click', () => {
      this.testSheetsConnection();
    });
    
    document.getElementById('exportCSVBtn').addEventListener('click', () => {
      this.exportCSV();
    });
    
    document.getElementById('bulkGenerateBtn').addEventListener('click', () => {
      this.showBulkGenerate();
    });

    // License tab
    document.getElementById('upgradeBtn').addEventListener('click', () => {
      this.showUpgrade();
    });
    
    document.getElementById('activateLicenseBtn').addEventListener('click', () => {
      this.activateLicense();
    });
    
    document.getElementById('deactivateLicenseBtn').addEventListener('click', () => {
      this.deactivateLicense();
    });

    // Template modal
    document.getElementById('closeTemplateModal').addEventListener('click', () => {
      this.hideTemplateModal();
    });
    
    document.getElementById('cancelTemplateBtn').addEventListener('click', () => {
      this.hideTemplateModal();
    });
    
    document.getElementById('saveTemplateBtn').addEventListener('click', () => {
      this.saveTemplate();
    });

    // Template form submission
    document.getElementById('templateForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveTemplate();
    });
  }

  /**
   * Show specific tab
   */
  showTab(tabName) {
    this.currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(button => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabName);
    });
    
    // Load tab-specific data
    switch (tabName) {
      case 'templates':
        this.renderTemplates();
        break;
      case 'settings':
        this.renderSettings();
        break;
      case 'integrations':
        this.renderIntegrations();
        break;
      case 'license':
        this.renderLicense();
        break;
    }
  }

  /**
   * Update UI based on current state
   */
  updateUI() {
    // Update premium status badge
    const statusBadge = document.getElementById('statusBadge');
    statusBadge.textContent = this.isPremium ? 'Pro' : 'Free';
    statusBadge.classList.toggle('pro', this.isPremium);
    
    // Update premium features
    document.querySelectorAll('.premium-feature').forEach(feature => {
      feature.style.opacity = this.isPremium ? '1' : '0.6';
    });
    
    document.querySelectorAll('.premium-feature button').forEach(button => {
      button.disabled = !this.isPremium;
    });
    
    // Update template upgrade notice
    const upgradeNotice = document.getElementById('templateUpgradeNotice');
    if (upgradeNotice) {
      upgradeNotice.style.display = 
        (!this.isPremium && this.templates.length >= 5) ? 'block' : 'none';
    }
  }

  /**
   * Render templates tab
   */
  renderTemplates() {
    const grid = document.getElementById('templatesGrid');
    
    if (this.templates.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          </svg>
          <h3>No templates yet</h3>
          <p>Create your first template to get started</p>
        </div>
      `;
      return;
    }
    
    grid.innerHTML = this.templates.map(template => `
      <div class="template-card">
        <div class="template-header">
          <div class="template-info">
            <h3>${this.escapeHtml(template.name)}</h3>
            <p>Created ${this.formatDate(template.createdAt)}</p>
          </div>
          <div class="template-actions">
            <button class="btn-icon edit-template-btn" data-template-id="${template.id}" title="Edit">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
              </svg>
            </button>
            <button class="btn-icon delete-template-btn" data-template-id="${template.id}" title="Delete">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
              </svg>
            </button>
          </div>
        </div>
        <div class="template-params">
          <div class="template-param">
            <span class="param-name">Source:</span>
            <span class="param-value">${this.escapeHtml(template.fields.source || '')}</span>
          </div>
          <div class="template-param">
            <span class="param-name">Medium:</span>
            <span class="param-value">${this.escapeHtml(template.fields.medium || '')}</span>
          </div>
          <div class="template-param">
            <span class="param-name">Campaign:</span>
            <span class="param-value">${this.escapeHtml(template.fields.campaignPattern || '')}</span>
          </div>
        </div>
      </div>
    `).join('');
    
    // Setup event delegation for template actions
    this.setupTemplateEventListeners();
  }

  /**
   * Setup event listeners for template actions
   */
  setupTemplateEventListeners() {
    const templatesGrid = document.getElementById('templatesGrid');
    
    // Remove existing listeners to avoid duplicates
    templatesGrid.removeEventListener('click', this.handleTemplateClick);
    
    // Add event delegation for template actions
    this.handleTemplateClick = (e) => {
      const button = e.target.closest('button');
      if (!button) return;
      
      const templateId = button.getAttribute('data-template-id');
      if (!templateId) return;
      
      if (button.classList.contains('edit-template-btn')) {
        this.editTemplate(templateId);
      } else if (button.classList.contains('delete-template-btn')) {
        this.deleteTemplate(templateId);
      }
    };
    
    templatesGrid.addEventListener('click', this.handleTemplateClick);
  }

  /**
   * Render settings tab
   */
  renderSettings() {
    // Populate form with current settings
    document.getElementById('defaultSource').value = this.settings.defaultSource || '';
    document.getElementById('defaultMedium').value = this.settings.defaultMedium || '';
    document.getElementById('lowercaseEnforced').checked = this.settings.lowercaseEnforced !== false;
    document.getElementById('hyphenateSpaces').checked = this.settings.hyphenateSpaces !== false;
    document.getElementById('autoCopy').checked = this.settings.autoCopy !== false;
  }

  /**
   * Render integrations tab
   */
  renderIntegrations() {
    const sheetsStatus = document.getElementById('sheetsStatus');
    const sheetsConfig = document.getElementById('sheetsConfig');
    
    if (this.integrations.googleSheets?.enabled) {
      sheetsStatus.textContent = 'Connected';
      sheetsStatus.className = 'integration-status connected';
      sheetsConfig.style.display = 'block';
      
      document.getElementById('sheetId').value = this.integrations.googleSheets.sheetId || '';
    } else {
      sheetsStatus.textContent = 'Not Connected';
      sheetsStatus.className = 'integration-status disconnected';
      sheetsConfig.style.display = 'none';
    }
  }

  /**
   * Render license tab
   */
  renderLicense() {
    const statusCard = document.querySelector('.status-card');
    const statusTitle = document.getElementById('licenseStatusTitle');
    const statusDescription = document.getElementById('licenseStatusDescription');
    const deactivateBtn = document.getElementById('deactivateLicenseBtn');
    
    if (this.isPremium) {
      statusCard.className = 'status-card pro';
      statusTitle.textContent = 'Pro Plan Active';
      statusDescription.textContent = 'All premium features are unlocked';
      deactivateBtn.style.display = 'inline-flex';
      
      // Update feature list
      document.querySelectorAll('.feature-item').forEach(item => {
        item.classList.remove('unavailable');
        item.classList.add('available');
        
        const svg = item.querySelector('svg');
        svg.innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>';
      });
    } else {
      statusCard.className = 'status-card free';
      statusTitle.textContent = 'Free Plan';
      statusDescription.textContent = "You're using the free version of UTM Link Generator";
      deactivateBtn.style.display = 'none';
    }
  }

  /**
   * Show template modal
   */
  showTemplateModal(template = null) {
    this.editingTemplate = template;
    
    const modal = document.getElementById('templateModal');
    const title = document.getElementById('modalTitle');
    const form = document.getElementById('templateForm');
    
    if (template) {
      title.textContent = 'Edit Template';
      document.getElementById('templateNameInput').value = template.name;
      document.getElementById('templateSource').value = template.fields.source || '';
      document.getElementById('templateMedium').value = template.fields.medium || '';
      document.getElementById('templateCampaign').value = template.fields.campaignPattern || '';
    } else {
      title.textContent = 'Add Template';
      form.reset();
    }
    
    modal.classList.remove('hidden');
    document.getElementById('templateNameInput').focus();
  }

  /**
   * Hide template modal
   */
  hideTemplateModal() {
    document.getElementById('templateModal').classList.add('hidden');
    this.editingTemplate = null;
  }

  /**
   * Save template
   */
  async saveTemplate() {
    const form = document.getElementById('templateForm');
    const formData = new FormData(form);
    
    const template = {
      name: document.getElementById('templateNameInput').value.trim(),
      fields: {
        source: document.getElementById('templateSource').value.trim(),
        medium: document.getElementById('templateMedium').value.trim(),
        campaignPattern: document.getElementById('templateCampaign').value.trim()
      }
    };
    
    if (!template.name || !template.fields.source || !template.fields.medium || !template.fields.campaignPattern) {
      this.showNotification('Please fill in all required fields', 'error');
      return;
    }
    
    try {
      if (this.editingTemplate) {
        template.id = this.editingTemplate.id;
        const response = await this.sendMessage({
          type: MESSAGE_TYPES.UPDATE_TEMPLATE,
          data: { template }
        });
        
        if (response.success) {
          this.showNotification('Template updated successfully', 'success');
        } else {
          throw new Error(response.error || 'Update failed');
        }
      } else {
        const response = await this.sendMessage({
          type: MESSAGE_TYPES.SAVE_TEMPLATE,
          data: { template }
        });
        
        if (response.success) {
          this.showNotification('Template saved successfully', 'success');
        } else if (response.requiresPremium) {
          this.showNotification(response.error, 'error');
          this.hideTemplateModal();
          this.showTab('license');
          return;
        } else {
          throw new Error(response.error || 'Save failed');
        }
      }
      
      await this.loadData();
      this.renderTemplates();
      this.hideTemplateModal();
      
    } catch (error) {
      console.error('Template save error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Edit template
   */
  editTemplate(templateId) {
    const template = this.templates.find(t => t.id === templateId);
    if (template) {
      this.showTemplateModal(template);
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId) {
    if (!confirm('Delete this template? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.DELETE_TEMPLATE,
        data: { templateId }
      });
      
      if (response.success) {
        this.showNotification('Template deleted successfully', 'success');
        await this.loadData();
        this.renderTemplates();
      } else {
        throw new Error(response.error || 'Delete failed');
      }
    } catch (error) {
      console.error('Template delete error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    const settings = {
      defaultSource: document.getElementById('defaultSource').value.trim(),
      defaultMedium: document.getElementById('defaultMedium').value.trim(),
      lowercaseEnforced: document.getElementById('lowercaseEnforced').checked,
      hyphenateSpaces: document.getElementById('hyphenateSpaces').checked,
      autoCopy: document.getElementById('autoCopy').checked
    };
    
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.UPDATE_SETTINGS,
        data: { settings }
      });
      
      if (response.success) {
        this.settings = settings;
        this.showNotification('Settings saved successfully', 'success');
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (error) {
      console.error('Settings save error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Reset settings to defaults
   */
  resetSettings() {
    if (!confirm('Reset all settings to defaults?')) {
      return;
    }
    
    document.getElementById('defaultSource').value = '';
    document.getElementById('defaultMedium').value = '';
    document.getElementById('lowercaseEnforced').checked = true;
    document.getElementById('hyphenateSpaces').checked = true;
    document.getElementById('autoCopy').checked = true;
    
    this.saveSettings();
  }

  /**
   * Connect Google Sheets
   */
  async connectGoogleSheets() {
    if (!this.isPremium) {
      this.showNotification('Google Sheets integration requires Pro subscription', 'error');
      this.showTab('license');
      return;
    }
    
    try {
      // Mock OAuth flow - replace with actual implementation
      const response = await this.sendMessage({
        type: 'connect_google_sheets'
      });
      
      if (response.success) {
        this.showNotification('Google Sheets connected successfully', 'success');
        await this.loadData();
        this.renderIntegrations();
      } else {
        throw new Error(response.error || 'Connection failed');
      }
    } catch (error) {
      console.error('Sheets connection error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Save Google Sheets configuration
   */
  async saveSheetsConfig() {
    const sheetId = document.getElementById('sheetId').value.trim();
    const sheetName = document.getElementById('sheetName').value.trim() || 'Sheet1';
    
    if (!sheetId) {
      this.showNotification('Please enter a valid Sheet ID', 'error');
      return;
    }
    
    try {
      const integrations = {
        ...this.integrations,
        googleSheets: {
          enabled: true,
          sheetId: sheetId,
          sheetName: sheetName,
          lastSync: null
        }
      };
      
      const response = await this.sendMessage({
        type: 'update_integrations',
        data: { integrations }
      });
      
      if (response.success) {
        this.integrations = integrations;
        this.showNotification('Sheets configuration saved', 'success');
      } else {
        throw new Error(response.error || 'Save failed');
      }
    } catch (error) {
      console.error('Sheets config error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Test Google Sheets connection
   */
  async testSheetsConnection() {
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.SYNC_SHEETS,
        data: {
          sheetId: this.integrations.googleSheets?.sheetId,
          data: [{ test: 'connection' }]
        }
      });
      
      if (response.success) {
        this.showNotification('Connection test successful', 'success');
      } else {
        throw new Error(response.error || 'Test failed');
      }
    } catch (error) {
      console.error('Sheets test error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Export to CSV
   */
  async exportCSV() {
    if (!this.isPremium) {
      this.showNotification('CSV export requires Pro subscription', 'error');
      this.showTab('license');
      return;
    }
    
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.EXPORT_CSV
      });
      
      if (response.success) {
        const csvContent = response.data.csvContent;
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `utm-links-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.showNotification('CSV export completed', 'success');
      } else {
        throw new Error(response.error || 'Export failed');
      }
    } catch (error) {
      console.error('CSV export error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Show bulk generate
   */
  showBulkGenerate() {
    if (!this.isPremium) {
      this.showNotification('Bulk generation requires Pro subscription', 'error');
      this.showTab('license');
      return;
    }
    
    // Open bulk generation interface
    this.showNotification('Bulk generation feature coming soon!', 'info');
  }

  /**
   * Show upgrade page
   */
  showUpgrade() {
    // Open external upgrade page or show pricing modal
    window.open('https://example.com/upgrade', '_blank');
  }

  /**
   * Activate license
   */
  async activateLicense() {
    const licenseKey = document.getElementById('licenseKey').value.trim();
    
    if (!licenseKey) {
      this.showNotification('Please enter a license key', 'error');
      return;
    }
    
    const activateBtn = document.getElementById('activateLicenseBtn');
    const activateText = document.getElementById('activateText');
    const activateSpinner = document.getElementById('activateSpinner');
    
    // Show loading state
    activateBtn.disabled = true;
    activateText.textContent = 'Activating...';
    activateSpinner.classList.remove('hidden');
    
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.VALIDATE_LICENSE,
        data: { licenseKey }
      });
      
      if (response.success && response.data.isValid) {
        this.isPremium = true;
        this.showNotification('License activated successfully!', 'success');
        this.showLicenseMessage('License activated successfully', 'success');
        await this.loadData();
        this.updateUI();
        this.renderLicense();
      } else {
        throw new Error('Invalid license key');
      }
    } catch (error) {
      console.error('License activation error:', error);
      this.showNotification('License activation failed', 'error');
      this.showLicenseMessage('Invalid license key or activation failed', 'error');
    } finally {
      // Reset button state
      activateBtn.disabled = false;
      activateText.textContent = 'Activate License';
      activateSpinner.classList.add('hidden');
    }
  }

  /**
   * Deactivate license
   */
  async deactivateLicense() {
    if (!confirm('Deactivate your Pro license? You will lose access to premium features.')) {
      return;
    }
    
    try {
      const response = await this.sendMessage({
        type: 'deactivate_license'
      });
      
      if (response.success) {
        this.isPremium = false;
        document.getElementById('licenseKey').value = '';
        this.showNotification('License deactivated', 'success');
        this.showLicenseMessage('License deactivated successfully', 'success');
        this.updateUI();
        this.renderLicense();
      } else {
        throw new Error(response.error || 'Deactivation failed');
      }
    } catch (error) {
      console.error('License deactivation error:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Show license status message
   */
  showLicenseMessage(message, type) {
    const messageEl = document.getElementById('licenseMessage');
    messageEl.textContent = message;
    messageEl.className = `license-status-message ${type}`;
    messageEl.style.display = 'block';
    
    setTimeout(() => {
      messageEl.style.display = 'none';
    }, 5000);
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
      success: '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>',
      error: '<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>',
      info: '<path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>'
    };
    
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            ${iconMap[type] || iconMap.info}
          </svg>
        </div>
        <div class="notification-text">
          <div class="notification-message">${this.escapeHtml(message)}</div>
        </div>
      </div>
    `;
    
    notifications.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Send message to background script
   */
  async sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  /**
   * Format date for display
   */
  formatDate(timestamp) {
    return new Date(timestamp).toLocaleDateString();
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize options page
const options = new OptionsPage();

// Make options globally available for onclick handlers
window.options = options;
