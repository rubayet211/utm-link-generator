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
  SYNC_SHEETS: 'sync_sheets'
};

const UTM_PARAMS = {
  SOURCE: 'utm_source',
  MEDIUM: 'utm_medium',
  CAMPAIGN: 'utm_campaign',
  TERM: 'utm_term',
  CONTENT: 'utm_content'
};

/**
 * UTM Link Generator Popup
 * Main UI controller for the extension popup
 */

class UTMPopup {
  constructor() {
    this.form = document.getElementById('utmForm');
    this.elements = this.getElements();
    this.currentTemplate = null;
    this.templates = [];
    this.history = [];
    this.settings = {};
    
    this.init();
  }

  /**
   * Get all DOM elements
   */
  getElements() {
    return {
      // Form elements
      baseUrl: document.getElementById('baseUrl'),
      templateSelect: document.getElementById('templateSelect'),
      utmSource: document.getElementById('utmSource'),
      utmMedium: document.getElementById('utmMedium'),
      utmCampaign: document.getElementById('utmCampaign'),
      utmTerm: document.getElementById('utmTerm'),
      utmContent: document.getElementById('utmContent'),
      
      // Buttons
      generateBtn: document.getElementById('generateBtn'),
      generateBtnText: document.getElementById('generateBtnText'),
      generateSpinner: document.getElementById('generateSpinner'),
      saveTemplateBtn: document.getElementById('saveTemplateBtn'),
      autofillBtn: document.getElementById('autofillBtn'),
      copyBtn: document.getElementById('copyBtn'),
      editBtn: document.getElementById('editBtn'),
      optionsBtn: document.getElementById('optionsBtn'),
      upgradeBtn: document.getElementById('upgradeBtn'),
      clearHistoryBtn: document.getElementById('clearHistoryBtn'),
      
      // Display elements
      historyBadge: document.getElementById('historyBadge'),
      resultSection: document.getElementById('resultSection'),
      generatedUrl: document.getElementById('generatedUrl'),
      successMessage: document.getElementById('successMessage'),
      historyList: document.getElementById('historyList'),
      historySearch: document.getElementById('historySearch'),
      
      // Validation messages
      sourceValidation: document.getElementById('sourceValidation'),
      mediumValidation: document.getElementById('mediumValidation'),
      campaignValidation: document.getElementById('campaignValidation'),
      
      // Template modal
      templateModal: document.getElementById('templateModal'),
      templateName: document.getElementById('templateName'),
      templatePreview: document.getElementById('templatePreview'),
      closeModalBtn: document.getElementById('closeModalBtn'),
      cancelTemplateBtn: document.getElementById('cancelTemplateBtn'),
      saveTemplateConfirmBtn: document.getElementById('saveTemplateConfirmBtn'),
      
      // Premium modal
      premiumModal: document.getElementById('premiumModal'),
      premiumFeatureTitle: document.getElementById('premiumFeatureTitle'),
      premiumFeatureMessage: document.getElementById('premiumFeatureMessage'),
      closePremiumModalBtn: document.getElementById('closePremiumModalBtn'),
      dismissPremiumBtn: document.getElementById('dismissPremiumBtn'),
      upgradePremiumBtn: document.getElementById('upgradePremiumBtn')
    };
  }

  /**
   * Initialize popup
   */
  async init() {
    await this.loadData();
    this.setupEventListeners();
    this.setupValidation();
    this.updateHistoryBadge();
    this.populateTemplates();
    this.autoFillFromPage();
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
      
      // Load history
      const historyResponse = await this.sendMessage({
        type: MESSAGE_TYPES.GET_HISTORY,
        data: { limit: 10 }
      });
      this.history = historyResponse.data?.history || [];
      
      // Load settings
      const settingsResponse = await this.sendMessage({
        type: 'get_settings'
      });
      this.settings = settingsResponse.data?.settings || {};
      
      this.renderHistory();
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleGenerate(e));
    
    // Template selection
    this.elements.templateSelect.addEventListener('change', (e) => this.handleTemplateSelect(e));
    
    // Auto-fill button
    this.elements.autofillBtn.addEventListener('click', () => this.autoFillFromPage());
    
    // Save template
    this.elements.saveTemplateBtn.addEventListener('click', () => this.showTemplateModal());
    
    // Result actions
    this.elements.copyBtn.addEventListener('click', () => this.copyToClipboard());
    this.elements.editBtn.addEventListener('click', () => this.editGeneratedUrl());
    
    // Navigation
    this.elements.optionsBtn.addEventListener('click', () => this.openOptions());
    this.elements.upgradeBtn.addEventListener('click', () => this.showUpgrade());
    
    // History
    this.elements.clearHistoryBtn.addEventListener('click', () => this.clearHistory());
    this.elements.historySearch.addEventListener('input', (e) => this.searchHistory(e.target.value));
    
    // Template modal
    this.elements.closeModalBtn.addEventListener('click', () => this.hideTemplateModal());
    this.elements.cancelTemplateBtn.addEventListener('click', () => this.hideTemplateModal());
    this.elements.saveTemplateConfirmBtn.addEventListener('click', () => this.saveTemplate());
    this.elements.templateName.addEventListener('input', () => this.updateTemplatePreview());
    
    // Premium modal
    this.elements.closePremiumModalBtn.addEventListener('click', () => this.hidePremiumModal());
    this.elements.dismissPremiumBtn.addEventListener('click', () => this.hidePremiumModal());
    this.elements.upgradePremiumBtn.addEventListener('click', () => this.openUpgrade());
    
    // Input changes for validation
    ['utmSource', 'utmMedium', 'utmCampaign'].forEach(field => {
      this.elements[field].addEventListener('input', () => this.validateField(field));
      this.elements[field].addEventListener('blur', () => this.validateField(field));
    });
  }

  /**
   * Setup real-time validation
   */
  setupValidation() {
    const rules = {
      forbidden: /[<>"`'&\s]/g,
      maxLength: 100
    };

    ['utmSource', 'utmMedium', 'utmCampaign'].forEach(field => {
      const input = this.elements[field];
      const validation = this.elements[field + 'Validation'];
      
      input.addEventListener('input', () => {
        const value = input.value.trim();
        const errors = [];
        
        if (rules.forbidden.test(value)) {
          errors.push('Contains forbidden characters');
        }
        
        if (value.length > rules.maxLength) {
          errors.push(`Exceeds ${rules.maxLength} characters`);
        }
        
        if (errors.length > 0) {
          input.classList.add('error');
          validation.textContent = errors[0];
        } else {
          input.classList.remove('error');
          validation.textContent = '';
        }
      });
    });
  }

  /**
   * Validate individual field
   */
  validateField(field) {
    const input = this.elements[field];
    const validation = this.elements[field + 'Validation'];
    const value = input.value.trim();
    
    if (!value && ['utmSource', 'utmMedium', 'utmCampaign'].includes(field)) {
      input.classList.add('error');
      validation.textContent = 'This field is required';
      return false;
    }
    
    input.classList.remove('error');
    validation.textContent = '';
    return true;
  }

  /**
   * Handle form submission
   */
  async handleGenerate(e) {
    e.preventDefault();
    
    // Validate form
    const isValid = this.validateForm();
    if (!isValid) return;
    
    // Show loading state
    this.setLoadingState(true);
    
    try {
      const formData = this.getFormData();
      
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.GENERATE_UTM,
        data: {
          baseUrl: formData.baseUrl,
          utmParams: formData.utmParams,
          templateId: this.currentTemplate?.id,
          saveToHistory: true
        }
      });
      
      if (response.success && response.data.success) {
        this.showResult(response.data);
        await this.loadData(); // Refresh history
      } else {
        this.showError(response.data?.errors || ['Generation failed']);
      }
    } catch (error) {
      console.error('Generation error:', error);
      this.showError(['Network error occurred']);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Validate entire form
   */
  validateForm() {
    let isValid = true;
    
    // Validate base URL
    const baseUrl = this.elements.baseUrl.value.trim();
    if (!baseUrl) {
      this.elements.baseUrl.classList.add('error');
      isValid = false;
    } else {
      try {
        new URL(baseUrl);
        this.elements.baseUrl.classList.remove('error');
      } catch {
        this.elements.baseUrl.classList.add('error');
        isValid = false;
      }
    }
    
    // Validate required UTM fields
    ['utmSource', 'utmMedium', 'utmCampaign'].forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  /**
   * Get form data
   */
  getFormData() {
    return {
      baseUrl: this.elements.baseUrl.value.trim(),
      utmParams: {
        [UTM_PARAMS.SOURCE]: this.elements.utmSource.value.trim(),
        [UTM_PARAMS.MEDIUM]: this.elements.utmMedium.value.trim(),
        [UTM_PARAMS.CAMPAIGN]: this.elements.utmCampaign.value.trim(),
        [UTM_PARAMS.TERM]: this.elements.utmTerm.value.trim(),
        [UTM_PARAMS.CONTENT]: this.elements.utmContent.value.trim()
      }
    };
  }

  /**
   * Show generation result
   */
  showResult(result) {
    this.elements.generatedUrl.textContent = result.url;
    this.elements.resultSection.classList.remove('hidden');
    
    if (result.copiedToClipboard) {
      this.elements.successMessage.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Copied to clipboard!
      `;
    } else {
      this.elements.successMessage.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        UTM link generated successfully
      `;
    }
  }

  /**
   * Show error messages
   */
  showError(errors) {
    this.elements.resultSection.classList.add('hidden');
    
    // Show errors in validation messages
    if (errors.length > 0) {
      this.elements.sourceValidation.textContent = errors.find(e => e.includes('source')) || '';
      this.elements.mediumValidation.textContent = errors.find(e => e.includes('medium')) || '';
      this.elements.campaignValidation.textContent = errors.find(e => e.includes('campaign')) || '';
    }
  }

  /**
   * Set loading state
   */
  setLoadingState(loading) {
    this.elements.generateBtn.disabled = loading;
    
    if (loading) {
      this.elements.generateBtnText.textContent = 'Generating...';
      this.elements.generateSpinner.classList.remove('hidden');
    } else {
      this.elements.generateBtnText.textContent = 'Generate UTM Link';
      this.elements.generateSpinner.classList.add('hidden');
    }
  }

  /**
   * Handle template selection
   */
  async handleTemplateSelect(e) {
    const templateId = e.target.value;
    
    if (!templateId) {
      this.currentTemplate = null;
      return;
    }
    
    this.currentTemplate = this.templates.find(t => t.id === templateId);
    if (this.currentTemplate) {
      this.applyTemplate(this.currentTemplate);
    }
  }

  /**
   * Apply template to form
   */
  applyTemplate(template) {
    if (template.fields) {
      if (template.fields.source) {
        this.elements.utmSource.value = template.fields.source;
      }
      if (template.fields.medium) {
        this.elements.utmMedium.value = template.fields.medium;
      }
      if (template.fields.campaignPattern) {
        // Process pattern
        const campaign = this.processTemplatePattern(template.fields.campaignPattern);
        this.elements.utmCampaign.value = campaign;
      }
    }
  }

  /**
   * Process template patterns
   */
  processTemplatePattern(pattern) {
    return pattern.replace(/\{(\w+)\}/g, (match, key) => {
      switch (key) {
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'month':
          return new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
        case 'year':
          return new Date().getFullYear().toString();
        default:
          return match;
      }
    });
  }

  /**
   * Auto-fill from current page
   */
  async autoFillFromPage() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (tab) {
        // Fill base URL if empty
        if (!this.elements.baseUrl.value.trim()) {
          // Remove UTM parameters from current URL
          const url = new URL(tab.url);
          ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach(param => {
            url.searchParams.delete(param);
          });
          this.elements.baseUrl.value = url.toString();
        }
        
        // Try to detect source/medium from domain
        this.autoDetectSourceMedium(tab.url);
      }
    } catch (error) {
      console.error('Auto-fill failed:', error);
    }
  }

  /**
   * Auto-detect source and medium from URL
   */
  autoDetectSourceMedium(url) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      
      // Social media detection
      const socialPatterns = {
        'facebook.com': { source: 'facebook', medium: 'social' },
        'twitter.com': { source: 'twitter', medium: 'social' },
        'x.com': { source: 'twitter', medium: 'social' },
        'linkedin.com': { source: 'linkedin', medium: 'social' },
        'instagram.com': { source: 'instagram', medium: 'social' }
      };
      
      for (const [pattern, params] of Object.entries(socialPatterns)) {
        if (hostname.includes(pattern)) {
          if (!this.elements.utmSource.value) {
            this.elements.utmSource.value = params.source;
          }
          if (!this.elements.utmMedium.value) {
            this.elements.utmMedium.value = params.medium;
          }
          return;
        }
      }
      
      // Default referral
      if (!this.elements.utmSource.value && !this.elements.utmMedium.value) {
        this.elements.utmSource.value = hostname.replace('www.', '').split('.')[0];
        this.elements.utmMedium.value = 'referral';
      }
    } catch (error) {
      // Invalid URL
    }
  }

  /**
   * Copy to clipboard
   */
  async copyToClipboard() {
    try {
      const url = this.elements.generatedUrl.textContent;
      await navigator.clipboard.writeText(url);
      
      // Show success feedback
      this.elements.successMessage.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Copied to clipboard!
      `;
    } catch (error) {
      console.error('Copy failed:', error);
    }
  }

  /**
   * Edit generated URL
   */
  editGeneratedUrl() {
    const url = this.elements.generatedUrl.textContent;
    this.elements.baseUrl.value = url;
    this.elements.resultSection.classList.add('hidden');
  }

  /**
   * Populate templates dropdown
   */
  populateTemplates() {
    const select = this.elements.templateSelect;
    
    // Clear existing options except first
    while (select.children.length > 1) {
      select.removeChild(select.lastChild);
    }
    
    // Add templates
    this.templates.forEach(template => {
      const option = document.createElement('option');
      option.value = template.id;
      option.textContent = template.name;
      select.appendChild(option);
    });
  }

  /**
   * Show template modal
   */
  showTemplateModal() {
    const formData = this.getFormData();
    
    // Pre-fill template name
    this.elements.templateName.value = '';
    
    // Update preview
    this.updateTemplatePreview();
    
    this.elements.templateModal.classList.remove('hidden');
    this.elements.templateName.focus();
  }

  /**
   * Hide template modal
   */
  hideTemplateModal() {
    this.elements.templateModal.classList.add('hidden');
  }

  /**
   * Update template preview
   */
  updateTemplatePreview() {
    const name = this.elements.templateName.value || 'My Template';
    const formData = this.getFormData();
    
    this.elements.templatePreview.innerHTML = `
      <strong>${name}</strong><br>
      Source: ${formData.utmParams[UTM_PARAMS.SOURCE] || '(empty)'}<br>
      Medium: ${formData.utmParams[UTM_PARAMS.MEDIUM] || '(empty)'}<br>
      Campaign: ${formData.utmParams[UTM_PARAMS.CAMPAIGN] || '(empty)'}
    `;
  }

  /**
   * Save template
   */
  async saveTemplate() {
    const name = this.elements.templateName.value.trim();
    if (!name) {
      this.elements.templateName.classList.add('error');
      return;
    }
    
    const formData = this.getFormData();
    const template = {
      name: name,
      fields: {
        source: formData.utmParams[UTM_PARAMS.SOURCE],
        medium: formData.utmParams[UTM_PARAMS.MEDIUM],
        campaignPattern: formData.utmParams[UTM_PARAMS.CAMPAIGN]
      }
    };
    
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.SAVE_TEMPLATE,
        data: { template }
      });
      
      if (response.success) {
        this.hideTemplateModal();
        await this.loadData();
        this.populateTemplates();
      } else if (response.requiresPremium) {
        this.hideTemplateModal();
        this.showPremiumModal('Unlimited Templates', response.error);
      } else {
        console.error('Template save failed:', response.error);
      }
    } catch (error) {
      console.error('Template save error:', error);
    }
  }

  /**
   * Render history list
   */
  renderHistory() {
    const list = this.elements.historyList;
    
    if (this.history.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
            <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/>
          </svg>
          <p>No recent links</p>
          <span>Generated links will appear here</span>
        </div>
      `;
      return;
    }
    
    list.innerHTML = this.history.map(item => `
      <div class="history-item">
        <div class="history-content">
          <div class="history-url" title="${item.utmUrl}">${this.truncateUrl(item.utmUrl)}</div>
          <div class="history-meta">${this.formatDate(item.createdAt)}</div>
        </div>
        <div class="history-actions">
          <button class="btn-icon" onclick="popup.copyHistoryItem('${item.id}')" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
            </svg>
          </button>
          <button class="btn-icon" onclick="popup.editHistoryItem('${item.id}')" title="Edit">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  }

  /**
   * Update history badge
   */
  updateHistoryBadge() {
    this.elements.historyBadge.textContent = this.history.length.toString();
  }

  /**
   * Search history
   */
  async searchHistory(query) {
    if (!query.trim()) {
      await this.loadData();
      return;
    }
    
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.GET_HISTORY,
        data: { searchQuery: query }
      });
      
      if (response.success) {
        this.history = response.data.history || [];
        this.renderHistory();
      }
    } catch (error) {
      console.error('Search failed:', error);
    }
  }

  /**
   * Clear history
   */
  async clearHistory() {
    if (!confirm('Clear all history? This cannot be undone.')) {
      return;
    }
    
    try {
      const response = await this.sendMessage({
        type: MESSAGE_TYPES.CLEAR_HISTORY
      });
      
      if (response.success) {
        this.history = [];
        this.renderHistory();
        this.updateHistoryBadge();
      }
    } catch (error) {
      console.error('Clear history failed:', error);
    }
  }

  /**
   * Copy history item
   */
  async copyHistoryItem(itemId) {
    const item = this.history.find(h => h.id === itemId);
    if (item) {
      try {
        await navigator.clipboard.writeText(item.utmUrl);
        // Show brief success indication
      } catch (error) {
        console.error('Copy failed:', error);
      }
    }
  }

  /**
   * Edit history item
   */
  editHistoryItem(itemId) {
    const item = this.history.find(h => h.id === itemId);
    if (item) {
      this.elements.baseUrl.value = item.url;
      
      // Extract UTM parameters
      try {
        const url = new URL(item.utmUrl);
        this.elements.utmSource.value = url.searchParams.get(UTM_PARAMS.SOURCE) || '';
        this.elements.utmMedium.value = url.searchParams.get(UTM_PARAMS.MEDIUM) || '';
        this.elements.utmCampaign.value = url.searchParams.get(UTM_PARAMS.CAMPAIGN) || '';
        this.elements.utmTerm.value = url.searchParams.get(UTM_PARAMS.TERM) || '';
        this.elements.utmContent.value = url.searchParams.get(UTM_PARAMS.CONTENT) || '';
      } catch (error) {
        console.error('URL parsing failed:', error);
      }
    }
  }

  /**
   * Show premium modal
   */
  showPremiumModal(feature, message) {
    this.elements.premiumFeatureTitle.textContent = feature;
    this.elements.premiumFeatureMessage.textContent = message;
    this.elements.premiumModal.classList.remove('hidden');
  }

  /**
   * Hide premium modal
   */
  hidePremiumModal() {
    this.elements.premiumModal.classList.add('hidden');
  }

  /**
   * Open options page
   */
  openOptions() {
    chrome.runtime.openOptionsPage();
  }

  /**
   * Show upgrade page
   */
  showUpgrade() {
    // Could open a web page or show upgrade modal
    this.showPremiumModal('Upgrade to Pro', 'Unlock unlimited templates, bulk generation, and team features.');
  }

  /**
   * Open upgrade page
   */
  openUpgrade() {
    this.hidePremiumModal();
    // Open upgrade page or options with upgrade tab
    chrome.runtime.openOptionsPage();
  }

  /**
   * Utility: Send message to background script
   */
  async sendMessage(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  /**
   * Utility: Truncate URL for display
   */
  truncateUrl(url, maxLength = 50) {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + '...';
  }

  /**
   * Utility: Format date
   */
  formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  }
}

// Initialize popup
const popup = new UTMPopup();

// Make popup globally available for onclick handlers
window.popup = popup;
