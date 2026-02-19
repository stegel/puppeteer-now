import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // ServiceNow instance configuration from .env
  instance: process.env.SN_INSTANCE,
  username: process.env.SN_USERNAME,
  password: process.env.SN_PASSWORD,

  // Base URLs
  getBaseUrl() {
    return `https://${this.instance}.service-now.com`;
  },

  // Horizon Design System components to validate
  horizonComponents: [
    'now-button',
    'now-input',
    'now-textarea',
    'now-dropdown',
    'now-modal',
    'now-card',
    'now-alert',
    'now-icon',
    'now-tabs',
    'now-toggle',
    'now-checkbox',
    'now-radio',
    'now-popover',
    'now-tooltip',
    'now-avatar',
    'now-badge',
    'now-progress',
    'now-loader'
  ],

  // Test pages to audit (customize these for your instance)
  testPages: [
    '/now/sow/home',
    '/now/sow/list',
    '/now/sow/record/sc_req_item/aec79906eb43011008f2951ff15228f0',
    '/now/alignment-workspace/portfolio-plans',
    '/now/alignment-workspace/portfolio-plans/sub/create-new-portfolio-plan'
  ],

  // Custom patterns to detect (non-Horizon implementations)
  customPatterns: {
    buttons: 'button:not([class*="now-"]), input[type="button"]:not([class*="now-"]), input[type="submit"]:not([class*="now-"])',
    inputs: 'input[type="text"]:not([class*="now-"]), input[type="email"]:not([class*="now-"]), input[type="password"]:not([class*="now-"])',
    textareas: 'textarea:not([class*="now-"])',
    selects: 'select:not([class*="now-"])'
  },

  // Puppeteer configuration
  puppeteerOptions: {
    headless: true, // Set to true for CI/CD
    defaultViewport: {
      width: 1920,
      height: 1080
    },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },

  // Timeouts (in milliseconds)
  timeouts: {
    navigation: 60000,
    componentLoad: 5000,
    login: 10000
  }
};
