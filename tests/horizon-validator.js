import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';

/**
 * Sleep utility function (replacement for deprecated page.waitForTimeout)
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Audit Horizon components on a page
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
async function auditHorizonComponents(page) {
  console.log('\n📊 Auditing Horizon components...');

  const results = {};

  for (const component of config.horizonComponents) {
    const count = await page.$$eval(component, elements => elements.length);

    if (count > 0) {
      // Get sample attributes/styles from first instance
      const details = await page.$eval(component, el => ({
        tagName: el.tagName.toLowerCase(),
        classes: el.className,
        attributes: Array.from(el.attributes).map(attr => `${attr.name}="${attr.value}"`).join(' ')
      }));

      results[component] = {
        count,
        details
      };

      console.log(`  ✅ ${component}: ${count} instance(s) found`);
    }
  }

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
