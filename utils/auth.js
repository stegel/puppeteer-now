import { config } from '../config.js';

/**
 * Login to ServiceNow instance
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
export async function loginToServiceNow(page) {
  console.log('🔐 Logging into ServiceNow...');

  const baseUrl = config.getBaseUrl();

  try {
    // Navigate to login page
    await page.goto(`${baseUrl}/login.do`, {
      waitUntil: 'networkidle2',
      timeout: config.timeouts.navigation
    });

    // Wait for login form
    await page.waitForSelector('#user_name', { timeout: config.timeouts.login });

    // Fill in credentials
    await page.type('#user_name', config.username);
    await page.type('#user_password', config.password);

    // Submit login form
    await Promise.all([
      page.click('#sysverb_login'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: config.timeouts.navigation })
    ]);

    // Verify login success
    const currentUrl = page.url();
    if (currentUrl.includes('login.do')) {
      throw new Error('Login failed - still on login page');
    }

    console.log('✅ Successfully logged in');
    return true;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

/**
 * Check if session is still valid
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
export async function isLoggedIn(page) {
  const currentUrl = page.url();
  return !currentUrl.includes('login.do');
}

/**
 * Logout from ServiceNow
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
export async function logout(page) {
  console.log('🚪 Logging out...');

  const baseUrl = config.getBaseUrl();

  try {
    await page.goto(`${baseUrl}/logout.do`, {
      waitUntil: 'networkidle2',
      timeout: config.timeouts.navigation
    });

    console.log('✅ Logged out successfully');
  } catch (error) {
    console.error('⚠️ Logout warning:', error.message);
  }
}
