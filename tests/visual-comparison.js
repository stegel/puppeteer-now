import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create visual comparison directory
 */
function createVisualComparisonDirectory() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '_');

  const comparisonDir = path.join(process.cwd(), 'reports', 'visual-comparison', timestamp);

  if (!fs.existsSync(comparisonDir)) {
    fs.mkdirSync(comparisonDir, { recursive: true });
  }

  console.log(`📁 Visual comparisons will be saved to: ${comparisonDir}\n`);
  return comparisonDir;
}

/**
 * Capture specific component screenshots
 */
async function captureComponentScreenshots(page, comparisonDir) {
  console.log('📸 Capturing component-level screenshots...\n');

  const components = await page.evaluate(() => {
    const componentData = [];

    // Function to search Shadow DOM
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

    // Priority components to capture
    const componentsToCapture = [
      'now-button',
      'now-input',
      'now-dropdown',
      'now-tabs',
      'now-toggle',
      'now-modal',
      'now-avatar'
    ];

    componentsToCapture.forEach(componentName => {
      const elementsInMain = Array.from(document.querySelectorAll(componentName));
      const elementsInShadow = searchInShadowDOM(document, componentName);
      const allElements = [...elementsInMain, ...elementsInShadow];

      // Get first few instances of each component
      allElements.slice(0, 3).forEach((element, index) => {
        const rect = element.getBoundingClientRect();

        // Only capture visible components
        if (rect.width > 0 && rect.height > 0 && rect.top >= 0) {
          componentData.push({
            component: componentName,
            index: index + 1,
            rect: {
              x: rect.x,
              y: rect.y,
              width: Math.min(rect.width, 800), // Cap width for readability
              height: Math.min(rect.height, 600)
            },
            attributes: Object.fromEntries(
              Array.from(element.attributes).map(attr => [attr.name, attr.value])
            )
          });
        }
      });
    });

    return componentData;
  });

  console.log(`Found ${components.length} visible components to capture\n`);

  // Capture each component
  for (const comp of components) {
    try {
      const filename = `${comp.component}_instance_${comp.index}.png`;
      const filepath = path.join(comparisonDir, filename);

      // Add padding around component
      const padding = 20;
      const clip = {
        x: Math.max(0, comp.rect.x - padding),
        y: Math.max(0, comp.rect.y - padding),
        width: comp.rect.width + (padding * 2),
        height: comp.rect.height + (padding * 2)
      };

      await page.screenshot({
        path: filepath,
        clip: clip
      });

      console.log(`  ✅ ${filename}`);

      // Save component metadata
      const metadataPath = filepath.replace('.png', '.json');
      fs.writeFileSync(metadataPath, JSON.stringify(comp, null, 2));

    } catch (error) {
      console.log(`  ⚠️ Skipped ${comp.component}_${comp.index}: ${error.message}`);
    }
  }

  return components;
}

/**
 * Generate visual comparison HTML report
 */
function generateVisualReport(comparisonDir, components) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Horizon Component Visual Comparison</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f5f5f5;
      padding: 40px 20px;
    }

    .container {
      max-width: 1400px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      padding: 40px;
    }

    h1 {
      color: #1a1a1a;
      margin-bottom: 10px;
    }

    .subtitle {
      color: #666;
      margin-bottom: 40px;
      font-size: 14px;
    }

    .component-section {
      margin-bottom: 50px;
      border-bottom: 1px solid #e0e0e0;
      padding-bottom: 30px;
    }

    .component-section:last-child {
      border-bottom: none;
    }

    .component-header {
      display: flex;
      align-items: center;
      margin-bottom: 20px;
    }

    .component-name {
      font-size: 24px;
      font-weight: 600;
      color: #2c3e50;
      margin-right: 12px;
    }

    .component-count {
      background: #e3f2fd;
      color: #1976d2;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }

    .instances {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-top: 20px;
    }

    .instance-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
      background: #fafafa;
    }

    .instance-header {
      background: #f5f5f5;
      padding: 12px 16px;
      border-bottom: 1px solid #e0e0e0;
      font-weight: 500;
      font-size: 14px;
      color: #666;
    }

    .instance-image {
      background: white;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 150px;
    }

    .instance-image img {
      max-width: 100%;
      height: auto;
      border: 1px solid #e0e0e0;
      border-radius: 4px;
    }

    .instance-meta {
      padding: 16px;
      font-size: 12px;
      color: #666;
      background: white;
      border-top: 1px solid #e0e0e0;
    }

    .meta-row {
      display: flex;
      margin-bottom: 8px;
    }

    .meta-label {
      font-weight: 600;
      color: #444;
      min-width: 80px;
    }

    .meta-value {
      color: #666;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      word-break: break-all;
    }

    .figma-placeholder {
      background: #fff3cd;
      border: 2px dashed #ffc107;
      border-radius: 8px;
      padding: 40px;
      text-align: center;
      color: #856404;
      margin-top: 20px;
    }

    .figma-placeholder h3 {
      margin-bottom: 10px;
    }

    .figma-placeholder p {
      font-size: 14px;
      line-height: 1.6;
    }

    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      border-radius: 8px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .stat-value {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 8px;
    }

    .stat-label {
      font-size: 14px;
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🎨 Horizon Component Visual Comparison</h1>
    <p class="subtitle">Service Operations Workspace - Component Screenshots</p>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-value">${new Set(components.map(c => c.component)).size}</div>
        <div class="stat-label">Component Types</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${components.length}</div>
        <div class="stat-label">Screenshots Captured</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">100%</div>
        <div class="stat-label">Shadow DOM</div>
      </div>
    </div>

${generateComponentSections(components)}

    <div class="figma-placeholder">
      <h3>📐 Figma Design Comparison</h3>
      <p>
        To complete the visual comparison:<br><br>
        1. Open the Figma file in Figma Desktop<br>
        2. Navigate to each component in the design library<br>
        3. Select the component and use Figma MCP: <code>get_screenshot</code><br>
        4. Place Figma screenshots alongside ServiceNow screenshots<br>
        5. Compare variants, sizing, spacing, and colors
      </p>
    </div>
  </div>
</body>
</html>`;

  const reportPath = path.join(comparisonDir, 'visual-comparison.html');
  fs.writeFileSync(reportPath, html);
  console.log(`\n📄 Visual report generated: visual-comparison.html`);

  return reportPath;
}

function generateComponentSections(components) {
  const grouped = components.reduce((acc, comp) => {
    if (!acc[comp.component]) {
      acc[comp.component] = [];
    }
    acc[comp.component].push(comp);
    return acc;
  }, {});

  return Object.entries(grouped).map(([componentName, instances]) => {
    const instanceCards = instances.map(inst => `
      <div class="instance-card">
        <div class="instance-header">Instance ${inst.index}</div>
        <div class="instance-image">
          <img src="${componentName}_instance_${inst.index}.png" alt="${componentName} instance ${inst.index}">
        </div>
        <div class="instance-meta">
          <div class="meta-row">
            <div class="meta-label">Size:</div>
            <div class="meta-value">${Math.round(inst.rect.width)}×${Math.round(inst.rect.height)}px</div>
          </div>
          ${Object.entries(inst.attributes).slice(0, 3).map(([key, value]) => `
            <div class="meta-row">
              <div class="meta-label">${key}:</div>
              <div class="meta-value">${value || '(empty)'}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    return `
      <div class="component-section">
        <div class="component-header">
          <div class="component-name">&lt;${componentName}&gt;</div>
          <div class="component-count">${instances.length} captured</div>
        </div>
        <div class="instances">
          ${instanceCards}
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Main visual comparison runner
 */
async function runVisualComparison() {
  console.log('🚀 Starting Visual Comparison Generator\n');

  if (!config.instance || !config.username || !config.password) {
    console.error('❌ Missing ServiceNow configuration in .env file');
    process.exit(1);
  }

  const comparisonDir = createVisualComparisonDirectory();
  const browser = await puppeteer.launch(config.puppeteerOptions);

  try {
    const page = await browser.newPage();

    // Set larger viewport for better component visibility
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2 // Higher resolution for clarity
    });

    await loginToServiceNow(page);

    // Test first page (SOW home)
    const testPage = config.testPages[0];
    const fullUrl = `${config.getBaseUrl()}${testPage}`;

    console.log(`📄 Analyzing page: ${testPage}\n`);

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: config.timeouts.navigation
    });

    await sleep(config.timeouts.componentLoad + 5000);

    // Capture full page screenshot first
    const fullPagePath = path.join(comparisonDir, 'full-page.png');
    await page.screenshot({
      path: fullPagePath,
      fullPage: true
    });
    console.log('✅ Full page screenshot captured\n');

    // Capture individual components
    const components = await captureComponentScreenshots(page, comparisonDir);

    // Generate HTML report
    const reportPath = generateVisualReport(comparisonDir, components);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Visual Comparison Complete!');
    console.log('='.repeat(60));
    console.log(`\n📁 Location: ${comparisonDir}`);
    console.log(`📄 Report: ${path.basename(reportPath)}`);
    console.log(`\n💡 Open the HTML report in your browser to view results`);
    console.log(`💡 Use Figma Desktop + MCP to capture matching design screenshots`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

runVisualComparison();
