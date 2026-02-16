import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';
import fs from 'fs';
import path from 'path';

/**
 * Sleep utility function (replacement for deprecated page.waitForTimeout)
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create timestamped screenshot directory
 * @returns {string} Path to the screenshot directory
 */
function createScreenshotDirectory() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');

  const screenshotDir = path.join(process.cwd(), 'screenshots', timestamp);

  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log(`📁 Screenshots will be saved to: ${screenshotDir}\n`);
  return screenshotDir;
}

/**
 * Save screenshot of current page
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {string} screenshotDir - Directory to save screenshots
 * @param {string} pageName - Name for the screenshot file
 */
async function saveScreenshot(page, screenshotDir, pageName) {
  const sanitizedName = pageName
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/^_+|_+$/g, '');

  const screenshotPath = path.join(screenshotDir, `${sanitizedName}.png`);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });

  console.log(`📸 Screenshot saved: ${sanitizedName}.png`);
  return screenshotPath;
}

/**
 * Audit Horizon components on a page (including Shadow DOM)
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
async function auditHorizonComponents(page) {
  console.log('\n📊 Auditing Horizon components (including Shadow DOM)...');

  const results = await page.evaluate((horizonComponents) => {
    const componentResults = {};

    // Function to recursively search inside shadow DOMs
    function searchInShadowDOM(root, componentName) {
      let found = [];

      // Search in current root
      const elements = root.querySelectorAll(componentName);
      found.push(...Array.from(elements));

      // Search in all shadow roots
      const allElements = root.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.shadowRoot) {
          found.push(...searchInShadowDOM(el.shadowRoot, componentName));
        }
      });

      return found;
    }

    horizonComponents.forEach(componentName => {
      const elementsInMain = document.querySelectorAll(componentName);
      const elementsInShadow = searchInShadowDOM(document, componentName);
      const allElements = [...elementsInMain, ...elementsInShadow];

      if (allElements.length > 0) {
        const firstElement = allElements[0];
        componentResults[componentName] = {
          count: allElements.length,
          countInMain: elementsInMain.length,
          countInShadow: elementsInShadow.length,
          details: {
            tagName: firstElement.tagName.toLowerCase(),
            classes: firstElement.className,
            attributes: Array.from(firstElement.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' '),
            hasShadowRoot: firstElement.shadowRoot ? true : false
          }
        };
      }
    });

    return componentResults;
  }, config.horizonComponents);

  // Log results
  Object.entries(results).forEach(([component, data]) => {
    console.log(`  ✅ ${component}: ${data.count} total (Main: ${data.countInMain}, Shadow DOM: ${data.countInShadow})`);
  });

  return results;
}

/**
 * Find custom patterns (non-Horizon components)
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
async function findCustomPatterns(page) {
  console.log('\n🔍 Detecting custom/non-Horizon patterns...');

  const customFindings = {};

  for (const [patternName, selector] of Object.entries(config.customPatterns)) {
    try {
      const count = await page.$$eval(selector, elements => elements.length);

      if (count > 0) {
        customFindings[patternName] = count;
        console.log(`  ⚠️ Found ${count} custom ${patternName} (not using Horizon)`);
      }
    } catch (error) {
      console.log(`  ℹ️ No custom ${patternName} detected`);
    }
  }

  return customFindings;
}

/**
 * Generate compliance report
 * @param {Object} horizonResults - Horizon component audit results
 * @param {Object} customResults - Custom pattern findings
 */
function generateReport(horizonResults, customResults, pageUrl) {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 COMPLIANCE REPORT: ${pageUrl}`);
  console.log('='.repeat(60));

  const horizonCount = Object.keys(horizonResults).length;
  const customCount = Object.values(customResults).reduce((sum, count) => sum + count, 0);

  console.log(`\n✅ Horizon components detected: ${horizonCount} types`);
  console.log(`⚠️ Custom/non-Horizon elements: ${customCount} total`);

  if (horizonCount > 0 && customCount === 0) {
    console.log('\n🎉 EXCELLENT! This page is fully Horizon-compliant!');
  } else if (horizonCount > customCount) {
    console.log('\n👍 GOOD. Mostly using Horizon, but some custom elements detected.');
  } else if (customCount > 0) {
    console.log('\n⚠️ WARNING. Significant custom elements detected. Consider migrating to Horizon.');
  }

  console.log('='.repeat(60) + '\n');
}

/**
 * Main test runner
 */
async function runValidation() {
  console.log('🚀 Starting ServiceNow Horizon Design System Validator\n');

  // Validate configuration
  if (!config.instance || !config.username || !config.password) {
    console.error('❌ Missing configuration. Please set SN_INSTANCE, SN_USERNAME, and SN_PASSWORD in .env file');
    process.exit(1);
  }

  const browser = await puppeteer.launch(config.puppeteerOptions);

  try {
    const page = await browser.newPage();

    // Create timestamped screenshot directory
    const screenshotDir = createScreenshotDirectory();

    // Login to ServiceNow
    await loginToServiceNow(page);

    // Test each configured page
    for (const testPage of config.testPages) {
      const fullUrl = `${config.getBaseUrl()}${testPage}`;

      console.log(`\n${'='.repeat(60)}`);
      console.log(`🔍 Testing page: ${testPage}`);
      console.log('='.repeat(60));

      try {
        await page.goto(fullUrl, {
          waitUntil: 'networkidle2',
          timeout: config.timeouts.navigation
        });

        // Wait for components to load
        await sleep(config.timeouts.componentLoad);

        // Save screenshot
        await saveScreenshot(page, screenshotDir, testPage);

        // Audit Horizon components
        const horizonResults = await auditHorizonComponents(page);

        // Find custom patterns
        const customResults = await findCustomPatterns(page);

        // Generate report
        generateReport(horizonResults, customResults, testPage);

      } catch (error) {
        console.error(`❌ Error testing page ${testPage}:`, error.message);
      }
    }

    console.log('✅ Validation complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run the validation
runValidation();
