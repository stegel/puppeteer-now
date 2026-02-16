import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';

/**
 * Sleep utility function (replacement for deprecated page.waitForTimeout)
 * @param {number} ms - Milliseconds to sleep
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Walk the DOM tree and extract all Horizon components
 * @param {import('puppeteer').Page} page - Puppeteer page instance
 */
async function extractComponentTree(page) {
  console.log('\n🌲 Extracting component tree...');

  const componentTree = await page.evaluate((horizonComponents) => {
    const results = [];

    // Find all Horizon components
    horizonComponents.forEach(componentName => {
      const elements = document.querySelectorAll(componentName);

      elements.forEach((element, index) => {
        const componentData = {
          component: componentName,
          instance: index + 1,
          attributes: {},
          innerHTML: element.innerHTML.substring(0, 100), // First 100 chars
          parent: element.parentElement?.tagName.toLowerCase(),
          children: Array.from(element.children).map(child => child.tagName.toLowerCase())
        };

        // Extract all attributes
        Array.from(element.attributes).forEach(attr => {
          componentData.attributes[attr.name] = attr.value;
        });

        results.push(componentData);
      });
    });

    return results;
  }, config.horizonComponents);

  return componentTree;
}

/**
 * Generate component inventory report
 * @param {Array} componentTree - Extracted component tree data
 */
function generateInventoryReport(componentTree, pageUrl) {
  console.log('\n' + '='.repeat(80));
  console.log(`📦 COMPONENT INVENTORY REPORT: ${pageUrl}`);
  console.log('='.repeat(80));

  if (componentTree.length === 0) {
    console.log('\n⚠️ No Horizon components found on this page.');
    return;
  }

  // Group by component type
  const grouped = componentTree.reduce((acc, item) => {
    if (!acc[item.component]) {
      acc[item.component] = [];
    }
    acc[item.component].push(item);
    return acc;
  }, {});

  console.log(`\n📊 Total Horizon components: ${componentTree.length}`);
  console.log(`📊 Unique component types: ${Object.keys(grouped).length}\n`);

  // Display detailed inventory
  Object.entries(grouped).forEach(([componentName, instances]) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`🔷 ${componentName.toUpperCase()} (${instances.length} instance${instances.length > 1 ? 's' : ''})`);
    console.log('─'.repeat(80));

    instances.forEach((instance, idx) => {
      console.log(`\n  Instance #${idx + 1}:`);
      console.log(`    Parent: <${instance.parent}>`);

      if (Object.keys(instance.attributes).length > 0) {
        console.log(`    Attributes:`);
        Object.entries(instance.attributes).forEach(([key, value]) => {
          console.log(`      ${key}="${value}"`);
        });
      }

      if (instance.children.length > 0) {
        console.log(`    Children: ${instance.children.join(', ')}`);
      }
    });
  });

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Analyze component usage patterns
 * @param {Array} componentTree - Extracted component tree data
 */
function analyzeUsagePatterns(componentTree) {
  console.log('\n📈 USAGE PATTERNS ANALYSIS');
  console.log('='.repeat(80));

  // Most used components
  const usage = componentTree.reduce((acc, item) => {
    acc[item.component] = (acc[item.component] || 0) + 1;
    return acc;
  }, {});

  const sorted = Object.entries(usage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  console.log('\n🏆 Top 5 Most Used Components:');
  sorted.forEach(([component, count], idx) => {
    console.log(`  ${idx + 1}. ${component}: ${count} instance${count > 1 ? 's' : ''}`);
  });

  // Common attribute patterns
  console.log('\n🔧 Common Attribute Patterns:');
  const allAttributes = componentTree.flatMap(c => Object.keys(c.attributes));
  const attrFrequency = allAttributes.reduce((acc, attr) => {
    acc[attr] = (acc[attr] || 0) + 1;
    return acc;
  }, {});

  Object.entries(attrFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([attr, count]) => {
      console.log(`  • ${attr}: used ${count} time${count > 1 ? 's' : ''}`);
    });

  console.log('\n' + '='.repeat(80) + '\n');
}

/**
 * Main component audit runner
 */
async function runComponentAudit() {
  console.log('🚀 Starting Deep Component Audit\n');

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

    // Audit first test page (can be modified to audit all pages)
    const testPage = config.testPages[0];
    const fullUrl = `${config.getBaseUrl()}${testPage}`;

    console.log(`\n📄 Auditing page: ${testPage}`);

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: config.timeouts.navigation
    });

    // Wait for components to load
    await sleep(config.timeouts.componentLoad);

    // Extract component tree
    const componentTree = await extractComponentTree(page);

    // Generate reports
    generateInventoryReport(componentTree, testPage);
    analyzeUsagePatterns(componentTree);

    console.log('✅ Component audit complete!');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

// Run the audit
runComponentAudit();
