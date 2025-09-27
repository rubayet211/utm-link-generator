// Constants will be available via importScripts

/**
 * Core UTM Link Generation Engine
 */
class UTMEngine {
  constructor() {
    this.validationRules = VALIDATION_RULES;
  }

  /**
   * Generate UTM URL from base URL and parameters
   * @param {string} baseUrl - The base URL to append UTM parameters to
   * @param {Object} utmParams - UTM parameters object
   * @param {Object} options - Generation options
   * @returns {Object} Result with success status and URL or errors
   */
  generateUTMUrl(baseUrl, utmParams, options = {}) {
    try {
      // Validate inputs
      const validation = this.validateInputs(baseUrl, utmParams, options);
      if (!validation.isValid) {
        return {
          success: false,
          errors: validation.errors,
          url: null
        };
      }

      // Clean and process parameters
      const cleanParams = this.processParameters(utmParams, options);
      
      // Build URL
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

  /**
   * Validate inputs before processing
   */
  validateInputs(baseUrl, utmParams, options) {
    const errors = [];

    // Validate base URL
    if (!baseUrl || typeof baseUrl !== 'string') {
      errors.push('Base URL is required');
    } else {
      try {
        new URL(baseUrl);
      } catch {
        errors.push('Base URL is not valid');
      }
    }

    // Validate required UTM parameters
    this.validationRules.REQUIRED_FIELDS.forEach(field => {
      const paramKey = this.getUTMParamKey(field);
      if (!utmParams[paramKey] || typeof utmParams[paramKey] !== 'string') {
        errors.push(`${field} is required`);
      }
    });

    // Validate parameter values
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        const validation = this.validateParameter(key, value, options);
        if (!validation.isValid) {
          errors.push(...validation.errors);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate individual parameter
   */
  validateParameter(key, value, options) {
    const errors = [];

    // Check length
    if (value.length > this.validationRules.MAX_LENGTH) {
      errors.push(`${key} exceeds maximum length of ${this.validationRules.MAX_LENGTH}`);
    }

    if (value.length < this.validationRules.MIN_LENGTH) {
      errors.push(`${key} must be at least ${this.validationRules.MIN_LENGTH} character`);
    }

    // Check forbidden characters
    if (this.validationRules.FORBIDDEN_CHARS.test(value)) {
      errors.push(`${key} contains forbidden characters`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Process and clean parameters according to settings
   */
  processParameters(utmParams, options) {
    const processed = {};

    Object.entries(utmParams).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        let cleanValue = value.trim();

        // Apply lowercase enforcement
        if (options.lowercaseEnforced !== false) {
          cleanValue = cleanValue.toLowerCase();
        }

        // Apply space hyphenation
        if (options.hyphenateSpaces !== false) {
          cleanValue = cleanValue.replace(/\s+/g, '-');
        }

        // Remove forbidden characters
        cleanValue = cleanValue.replace(this.validationRules.FORBIDDEN_CHARS, '');

        // URL encode
        processed[key] = encodeURIComponent(cleanValue);
      }
    });

    return processed;
  }

  /**
   * Build final URL with UTM parameters
   */
  buildUrl(baseUrl, utmParams) {
    const url = new URL(baseUrl);
    
    Object.entries(utmParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  }

  /**
   * Apply template to generate UTM parameters
   */
  applyTemplate(template, context = {}) {
    const params = {};

    if (template.fields) {
      Object.entries(template.fields).forEach(([key, value]) => {
        if (value) {
          // Process template patterns
          let processedValue = this.processTemplatePattern(value, context);
          const utmKey = this.getUTMParamKey(key);
          params[utmKey] = processedValue;
        }
      });
    }

    return params;
  }

  /**
   * Process template patterns like {date}, {platform}, etc.
   */
  processTemplatePattern(pattern, context) {
    if (!pattern || typeof pattern !== 'string') return pattern;

    return pattern.replace(/\{(\w+)\}/g, (match, key) => {
      switch (key) {
        case 'date':
          return new Date().toISOString().split('T')[0];
        case 'timestamp':
          return Date.now().toString();
        case 'month':
          return new Date().toLocaleDateString('en-US', { month: 'short' }).toLowerCase();
        case 'year':
          return new Date().getFullYear().toString();
        default:
          return context[key] || match;
      }
    });
  }

  /**
   * Bulk generate UTM URLs from array of inputs
   */
  bulkGenerate(inputs, options = {}) {
    const results = [];

    inputs.forEach((input, index) => {
      const result = this.generateUTMUrl(input.baseUrl, input.utmParams, options);
      results.push({
        index,
        input,
        ...result
      });
    });

    return {
      results,
      summary: {
        total: inputs.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      }
    };
  }

  /**
   * Auto-detect UTM parameters from page context
   */
  autoDetectFromPage(pageInfo) {
    const detected = {};
    
    if (!pageInfo) return detected;

    // Detect from referrer
    if (pageInfo.referrer) {
      const referrerDetection = this.detectFromReferrer(pageInfo.referrer);
      Object.assign(detected, referrerDetection);
    }

    // Detect from page URL
    if (pageInfo.url) {
      const urlDetection = this.detectFromUrl(pageInfo.url);
      Object.assign(detected, urlDetection);
    }

    // Detect from page title for campaign
    if (pageInfo.title && !detected[UTM_PARAMS.CAMPAIGN]) {
      detected[UTM_PARAMS.CAMPAIGN] = this.generateCampaignFromTitle(pageInfo.title);
    }

    return detected;
  }

  /**
   * Detect source and medium from referrer URL
   */
  detectFromReferrer(referrer) {
    const detected = {};
    
    try {
      const referrerUrl = new URL(referrer);
      const hostname = referrerUrl.hostname.toLowerCase();

      // Check against known patterns
      for (const [pattern, params] of Object.entries({
        ...URL_PATTERNS.SOCIAL,
        ...URL_PATTERNS.SEARCH,
        ...URL_PATTERNS.EMAIL
      })) {
        if (hostname.includes(pattern)) {
          detected[UTM_PARAMS.SOURCE] = params.source;
          detected[UTM_PARAMS.MEDIUM] = params.medium;
          break;
        }
      }

      // Fallback to domain name
      if (!detected[UTM_PARAMS.SOURCE]) {
        detected[UTM_PARAMS.SOURCE] = hostname.replace('www.', '').split('.')[0];
        detected[UTM_PARAMS.MEDIUM] = 'referral';
      }
    } catch (error) {
      // Invalid referrer URL
    }

    return detected;
  }

  /**
   * Detect parameters from current page URL
   */
  detectFromUrl(url) {
    const detected = {};
    
    try {
      const pageUrl = new URL(url);
      const hostname = pageUrl.hostname.toLowerCase();

      // If it's a social media or email platform, suggest appropriate params
      for (const [pattern, params] of Object.entries(URL_PATTERNS.SOCIAL)) {
        if (hostname.includes(pattern)) {
          detected[UTM_PARAMS.SOURCE] = params.source;
          detected[UTM_PARAMS.MEDIUM] = params.medium;
          break;
        }
      }
    } catch (error) {
      // Invalid URL
    }

    return detected;
  }

  /**
   * Generate campaign name from page title
   */
  generateCampaignFromTitle(title) {
    if (!title) return '';
    
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join('-');
  }

  /**
   * Export UTM data to CSV format
   */
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

  /**
   * Extract UTM parameter from URL
   */
  extractUTMParam(url, param) {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams.get(param) || '';
    } catch {
      return '';
    }
  }

  /**
   * Get UTM parameter key from field name
   */
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

  /**
   * Validate UTM URL
   */
  validateUTMUrl(url) {
    try {
      const urlObj = new URL(url);
      const hasUTMParams = this.validationRules.REQUIRED_FIELDS.some(field => {
        const paramKey = this.getUTMParamKey(field);
        return urlObj.searchParams.has(paramKey);
      });

      return {
        isValid: hasUTMParams,
        url: urlObj.toString(),
        params: this.extractAllUTMParams(url)
      };
    } catch {
      return {
        isValid: false,
        url: null,
        params: {}
      };
    }
  }

  /**
   * Extract all UTM parameters from URL
   */
  extractAllUTMParams(url) {
    const params = {};
    Object.values(UTM_PARAMS).forEach(param => {
      const value = this.extractUTMParam(url, param);
      if (value) {
        params[param] = value;
      }
    });
    return params;
  }
}

// Create singleton instance
const utmEngine = new UTMEngine();
