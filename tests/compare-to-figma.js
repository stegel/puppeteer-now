import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';
import { getLocalTimestamp, getReadableTimestamp } from '../utils/timestamp.js';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create timestamped report directory
 */
function createReportDirectory() {
  const timestamp = getLocalTimestamp();

  const reportDir = path.join(process.cwd(), 'reports', timestamp);

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  console.log(`📁 Report will be saved to: ${reportDir}\n`);
  return reportDir;
}

/**
 * Save screenshot of current page
 */
async function saveScreenshot(page, reportDir, pageName) {
  const sanitizedName = pageName
    .replace(/\//g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .replace(/^_+|_+$/g, '');

  const screenshotPath = path.join(reportDir, `${sanitizedName}.png`);

  await page.screenshot({
    path: screenshotPath,
    fullPage: true
  });

  console.log(`📸 Screenshot saved: ${sanitizedName}.png`);
  return screenshotPath;
}

/**
 * Extract Horizon components from page (including Shadow DOM)
 */
async function extractComponents(page) {
  return await page.evaluate((horizonComponents) => {
    const componentResults = {};

    function searchInShadowDOM(root, componentName) {
      let found = [];
      const elements = root.querySelectorAll(componentName);
      found.push(...Array.from(elements));

      const allElements = root.querySelectorAll('*');
      allElements.forEach(el => {
        if (el.shadowRoot) {
          found.push(...searchInShadowDOM(el.shadowRoot, componentName));
        }
      });

      return found;
    }

    horizonComponents.forEach(componentName => {
      const elementsInMain = Array.from(document.querySelectorAll(componentName));
      const elementsInShadow = searchInShadowDOM(document, componentName);
      const allElements = [...elementsInMain, ...elementsInShadow];

      if (allElements.length > 0) {
        const instances = allElements.map(el => ({
          tagName: el.tagName.toLowerCase(),
          attributes: Object.fromEntries(
            Array.from(el.attributes).map(attr => [attr.name, attr.value])
          ),
          variant: el.getAttribute('variant') || 'default',
          size: el.getAttribute('size') || 'default',
          state: el.getAttribute('disabled') !== null ? 'disabled' : 'enabled',
          hasIcon: el.getAttribute('icon') ? true : false,
          parent: el.parentElement?.tagName.toLowerCase()
        }));

        componentResults[componentName] = {
          count: allElements.length,
          countInMain: elementsInMain.length,
          countInShadow: elementsInShadow.length,
          instances: instances,
          variants: [...new Set(instances.map(i => i.variant))],
          sizes: [...new Set(instances.map(i => i.size))]
        };
      }
    });

    return componentResults;
  }, config.horizonComponents);
}

/**
 * Placeholder for Figma integration
 * This will be called by Claude using the Figma MCP
 */
function generateFigmaInstructions(figmaFileUrl) {
  return {
    instructions: `
To complete the Figma comparison, please use the Figma MCP server to:

1. Fetch the Figma file: ${figmaFileUrl || '[Figma file URL needed]'}

2. Extract component information:
   - Component names and variants
   - Design tokens (colors, spacing, typography)
   - Component properties and states
   - Size variants

3. For each Horizon component (now-button, now-input, etc.):
   - Get Figma component definition
   - List expected variants and properties
   - Document design specifications

4. Compare extracted ServiceNow components against Figma specs:
   - Check if variants match Figma definitions
   - Validate size options
   - Identify usage of non-standard variants
   - Flag missing or incorrect attributes

5. Generate comparison report with:
   - Components matching Figma specs
   - Components with deviations
   - Missing components (in Figma but not used)
   - Extra components (used but not in Figma)
   - Compliance score

Example Figma MCP queries to use:
- Get file components
- Get component properties
- Get design tokens
- Get component variants
`,
    figmaFileUrl: figmaFileUrl,
    requiresFigmaMCP: true
  };
}

/**
 * Generate markdown comparison report
 */
function generateMarkdownReport(reportDir, pageUrl, components, figmaData) {
  const reportPath = path.join(reportDir, 'comparison-report.md');

  const totalComponents = Object.values(components).reduce((sum, c) => sum + c.count, 0);
  const componentTypes = Object.keys(components).length;

  let report = `# Horizon Design System Comparison Report

**Page:** ${pageUrl}
**Date:** ${getReadableTimestamp()}
**Total Components:** ${totalComponents}
**Component Types:** ${componentTypes}

---

## 📊 Implementation Summary

`;

  // Component inventory
  report += `### Components Found\n\n`;
  Object.entries(components).forEach(([name, data]) => {
    report += `#### ${name}\n`;
    report += `- **Count:** ${data.count} (Main: ${data.countInMain}, Shadow: ${data.countInShadow})\n`;
    report += `- **Variants:** ${data.variants.join(', ')}\n`;
    report += `- **Sizes:** ${data.sizes.join(', ')}\n\n`;
  });

  // Figma comparison section
  report += `\n---\n\n## 🎨 Figma Comparison\n\n`;

  if (figmaData && figmaData.requiresFigmaMCP) {
    report += figmaData.instructions;
  } else {
    report += `*Figma comparison requires manual analysis using Figma MCP server.*\n\n`;
    report += `Please provide the Figma design system file URL to enable automated comparison.\n`;
  }

  // Recommendations
  report += `\n---\n\n## 💡 Recommendations\n\n`;
  report += `1. Review component variants against Figma design system\n`;
  report += `2. Validate size options match design specifications\n`;
  report += `3. Check for consistent icon usage patterns\n`;
  report += `4. Ensure all components follow Horizon guidelines\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Report saved: comparison-report.md`);

  return reportPath;
}

/**
 * Main comparison runner
 */
async function runComparison() {
  console.log('🚀 Starting Horizon to Figma Comparison\n');

  // Get Figma file URL from command line or prompt
  const figmaFileUrl = process.argv[2] || null;

  if (!config.instance || !config.username || !config.password) {
    console.error('❌ Missing ServiceNow configuration in .env file');
    process.exit(1);
  }

  const reportDir = createReportDirectory();
  const browser = await puppeteer.launch(config.puppeteerOptions);

  try {
    const page = await browser.newPage();
    await loginToServiceNow(page);

    // Test first page (defaults to SOW home)
    const testPage = config.testPages[0];
    const fullUrl = `${config.getBaseUrl()}${testPage}`;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 Analyzing page: ${testPage}`);
    console.log('='.repeat(60));

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: config.timeouts.navigation
    });

    await sleep(config.timeouts.componentLoad + 5000);

    // Take screenshot
    await saveScreenshot(page, reportDir, testPage);

    // Extract components
    console.log('\n📊 Extracting Horizon components...\n');
    const components = await extractComponents(page);

    Object.entries(components).forEach(([name, data]) => {
      console.log(`  ✅ ${name}: ${data.count} instances`);
    });

    // Generate Figma instructions
    const figmaData = generateFigmaInstructions(figmaFileUrl);

    // Generate report
    const reportPath = generateMarkdownReport(reportDir, fullUrl, components, figmaData);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Comparison Complete!');
    console.log('='.repeat(60));
    console.log(`\n📁 Results saved to: ${reportDir}`);
    console.log(`📄 Report: ${path.basename(reportPath)}`);

    if (!figmaFileUrl) {
      console.log('\n💡 Tip: Provide Figma file URL as argument:');
      console.log('   npm run compare-figma <figma-file-url>');
      console.log('\n   Then use Claude with Figma MCP to complete the comparison.');
    }

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

runComparison();
