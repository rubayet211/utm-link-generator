// Schema version for data migration
const SCHEMA_VERSION = 1;

// Storage keys
const STORAGE_KEYS = {
  TEMPLATES: 'templates',
  HISTORY: 'history',
  SETTINGS: 'settings',
  INTEGRATIONS: 'integrations',
  IS_PREMIUM: 'isPremium',
  LICENSE_KEY: 'licenseKey',
  SCHEMA_VERSION: 'schemaVersion'
};

// Default settings
const DEFAULT_SETTINGS = {
  defaultSource: '',
  defaultMedium: '',
  lowercaseEnforced: true,
  hyphenateSpaces: true,
  autoCopy: true
};

// Default templates
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

// Validation rules
const VALIDATION_RULES = {
  REQUIRED_FIELDS: ['source', 'medium', 'campaign'],
  FORBIDDEN_CHARS: /[<>"`'&\s]/g,
  MAX_LENGTH: 100,
  MIN_LENGTH: 1
};

// UTM parameters
const UTM_PARAMS = {
  SOURCE: 'utm_source',
  MEDIUM: 'utm_medium',
  CAMPAIGN: 'utm_campaign',
  TERM: 'utm_term',
  CONTENT: 'utm_content'
};

// Free tier limits
const FREE_LIMITS = {
  HISTORY_SIZE: 50,
  TEMPLATES: 5,
  BULK_GENERATION: 10
};

// Premium feature flags
const PREMIUM_FEATURES = {
  UNLIMITED_TEMPLATES: 'unlimited_templates',
  BULK_GENERATION: 'bulk_generation',
  CSV_EXPORT: 'csv_export',
  GOOGLE_SHEETS: 'google_sheets',
  TEAM_SHARING: 'team_sharing'
};

// Notification types
const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Common URL patterns for auto-detection
const URL_PATTERNS = {
  SOCIAL: {
    'facebook.com': { source: 'facebook', medium: 'social' },
    'twitter.com': { source: 'twitter', medium: 'social' },
    'x.com': { source: 'twitter', medium: 'social' },
    'linkedin.com': { source: 'linkedin', medium: 'social' },
    'instagram.com': { source: 'instagram', medium: 'social' }
  },
  SEARCH: {
    'google.com': { source: 'google', medium: 'organic' },
    'bing.com': { source: 'bing', medium: 'organic' },
    'yahoo.com': { source: 'yahoo', medium: 'organic' }
  },
  EMAIL: {
    'gmail.com': { source: 'email', medium: 'email' },
    'outlook.com': { source: 'email', medium: 'email' }
  }
};

// Message types for communication between components
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
