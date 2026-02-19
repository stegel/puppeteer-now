import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';
import { getLocalTimestamp } from '../utils/timestamp.js';
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const figmaMapping = require('../figma-component-mapping.json');

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
  const timestamp = getLocalTimestamp();

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
 * Validate found Horizon components against their Figma specs (variants + sizes)
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 * @param {Object} auditResults - Output of auditHorizonComponents
 */
async function validateComponentSpecs(page, auditResults) {
  console.log('\n🔬 Validating component specs against Figma mapping...');

  const specViolations = {};

  for (const componentName of Object.keys(auditResults)) {
    const spec = figmaMapping.componentMapping[componentName];
    if (!spec || !spec.figmaComponentNodeId) continue;

    const violations = await page.evaluate((componentName, spec) => {
      const variantPatterns = ['primary', 'secondary', 'tertiary', 'destructive', 'ghost',
        'default', 'error', 'warning', 'info', 'success', 'bare', 'iconic', 'filled', 'outlined', 'text'];
      const sizePatterns = ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full'];

      function getClassVariants(el) {
        const target = el.shadowRoot?.querySelector('button, input, textarea, div[class]') || el;
        const classes = (target.className || '').split(/\s+/);
        return {
          variants: classes.filter(c => c.startsWith('-')).map(c => c.slice(1)).filter(c => variantPatterns.includes(c)),
          sizes: classes.filter(c => c.startsWith('-')).map(c => c.slice(1)).filter(c => sizePatterns.includes(c))
        };
      }

      function searchShadowDOM(root, selector) {
        const found = [...root.querySelectorAll(selector)];
        root.querySelectorAll('*').forEach(el => {
          if (el.shadowRoot) found.push(...searchShadowDOM(el.shadowRoot, selector));
        });
        return found;
      }

      const elements = searchShadowDOM(document, componentName);
      const issues = [];

      elements.forEach((el, i) => {
        const label = `Instance ${i + 1}`;
        const { variants, sizes } = getClassVariants(el);

        const invalidVariants = variants.filter(v => !spec.variants.includes(v));
        const invalidSizes = sizes.filter(s => !spec.sizes.includes(s));

        if (invalidVariants.length > 0) {
          issues.push(`${label}: invalid variant(s) "${invalidVariants.join(', ')}" — expected one of [${spec.variants.join(', ')}]`);
        }
        if (invalidSizes.length > 0) {
          issues.push(`${label}: invalid size(s) "${invalidSizes.join(', ')}" — expected one of [${spec.sizes.join(', ')}]`);
        }

        // shadow: check attribute value against spec.shadow if defined
        if (spec.shadow) {
          const shadowVal = el.getAttribute('shadow');
          if (shadowVal !== null && !spec.shadow.includes(shadowVal)) {
            issues.push(`${label}: invalid shadow "${shadowVal}" — expected one of [${spec.shadow.join(', ')}]`);
          }
        }

        // sidebar: check attribute value against spec.sidebar if defined
        if (spec.sidebar) {
          const sidebarVal = el.getAttribute('sidebar');
          if (sidebarVal !== null && !spec.sidebar.includes(sidebarVal)) {
            issues.push(`${label}: invalid sidebar "${sidebarVal}" — expected one of [${spec.sidebar.join(', ')}]`);
          }
        }

        // actionType: check attribute value against spec.actionType if defined
        if (spec.actionType) {
          const actionTypeVal = el.getAttribute('action-type');
          if (actionTypeVal !== null && !spec.actionType.includes(actionTypeVal)) {
            issues.push(`${label}: invalid action-type "${actionTypeVal}" — expected one of [${spec.actionType.join(', ')}]`);
          }
        }

        // orientation: check attribute value against spec.orientation if defined
        if (spec.orientation) {
          const orientationVal = el.getAttribute('orientation');
          if (orientationVal !== null && !spec.orientation.includes(orientationVal)) {
            issues.push(`${label}: invalid orientation "${orientationVal}" — expected one of [${spec.orientation.join(', ')}]`);
          }
        }

        // label: check attribute value against spec.label if defined
        if (spec.label) {
          const labelVal = el.getAttribute('label');
          if (labelVal !== null && !spec.label.includes(labelVal)) {
            issues.push(`${label}: invalid label "${labelVal}" — expected one of [${spec.label.join(', ')}]`);
          }
        }

        // action: check attribute value against spec.action if defined
        if (spec.action) {
          const actionVal = el.getAttribute('action');
          if (actionVal !== null && !spec.action.includes(actionVal)) {
            issues.push(`${label}: invalid action "${actionVal}" — expected one of [${spec.action.join(', ')}]`);
          }
        }

        // primaryPosition: check attribute value against spec.primaryPosition if defined
        if (spec.primaryPosition) {
          const primaryPositionVal = el.getAttribute('primary-position');
          if (primaryPositionVal !== null && !spec.primaryPosition.includes(primaryPositionVal)) {
            issues.push(`${label}: invalid primary-position "${primaryPositionVal}" — expected one of [${spec.primaryPosition.join(', ')}]`);
          }
        }

        // secondaryPosition: check attribute value against spec.secondaryPosition if defined
        if (spec.secondaryPosition) {
          const secondaryPositionVal = el.getAttribute('secondary-position');
          if (secondaryPositionVal !== null && !spec.secondaryPosition.includes(secondaryPositionVal)) {
            issues.push(`${label}: invalid secondary-position "${secondaryPositionVal}" — expected one of [${spec.secondaryPosition.join(', ')}]`);
          }
        }
      });

      return issues;
    }, componentName, spec);

    if (violations.length > 0) {
      specViolations[componentName] = violations;
      console.log(`  ❌ ${componentName}: ${violations.length} spec violation(s)`);
      violations.forEach(v => console.log(`     → ${v}`));
    } else {
      console.log(`  ✅ ${componentName}: spec compliant`);
    }
  }

  return specViolations;
}

/**
 * Generate compliance report
 * @param {Object} horizonResults - Horizon component audit results
 * @param {Object} customResults - Custom pattern findings
 * @param {Object} specViolations - Figma spec violations
 * @param {string} pageUrl - Page URL being audited
 */
function generateReport(horizonResults, customResults, specViolations, pageUrl) {
  console.log('\n' + '='.repeat(60));
  console.log(`📋 COMPLIANCE REPORT: ${pageUrl}`);
  console.log('='.repeat(60));

  const horizonCount = Object.keys(horizonResults).length;
  const customCount = Object.values(customResults).reduce((sum, count) => sum + count, 0);
  const specViolationCount = Object.keys(specViolations).length;

  console.log(`\n✅ Horizon components detected: ${horizonCount} types`);
  console.log(`⚠️ Custom/non-Horizon elements: ${customCount} total`);
  console.log(`🔬 Figma spec violations: ${specViolationCount} component(s)`);

  if (horizonCount > 0 && customCount === 0 && specViolationCount === 0) {
    console.log('\n🎉 EXCELLENT! This page is fully Horizon-compliant!');
  } else if (horizonCount > customCount && specViolationCount === 0) {
    console.log('\n👍 GOOD. Mostly using Horizon, but some custom elements detected.');
  } else if (specViolationCount > 0) {
    console.log('\n⚠️ WARNING. Horizon components found but some violate Figma specs.');
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

        // Validate against Figma specs
        const specViolations = await validateComponentSpecs(page, horizonResults);

        // Generate report
        generateReport(horizonResults, customResults, specViolations, testPage);

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
