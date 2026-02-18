import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';
import { getLocalTimestamp, getReadableTimestamp, getLocalISOTimestamp } from '../utils/timestamp.js';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Extract variants and sizes from class names
 * Pattern: class="now-button -secondary -md"
 */
function parseComponentClasses(className) {
  if (!className) return { variants: [], sizes: [] };

  const classes = className.split(/\s+/);

  // Common variants (with dash prefix)
  const variantPatterns = [
    'primary', 'secondary', 'tertiary', 'destructive', 'ghost',
    'default', 'error', 'warning', 'info', 'success',
    'bare', 'iconic', 'filled', 'outlined', 'text'
  ];

  // Common sizes (with dash prefix)
  const sizePatterns = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

  const variants = classes
    .filter(c => c.startsWith('-'))
    .map(c => c.substring(1))
    .filter(c => variantPatterns.includes(c));

  const sizes = classes
    .filter(c => c.startsWith('-'))
    .map(c => c.substring(1))
    .filter(c => sizePatterns.includes(c));

  return {
    variants: variants.length > 0 ? variants : ['default'],
    sizes: sizes.length > 0 ? sizes : ['default']
  };
}

/**
 * Extract enhanced component data with class-based variants
 */
async function extractEnhancedComponents(page) {
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

    // Function to parse class-based variants and sizes
    function parseClasses(className) {
      if (!className) return { variants: ['default'], sizes: ['default'] };

      const classes = className.split(/\s+/);

      const variantPatterns = [
        'primary', 'secondary', 'tertiary', 'destructive', 'ghost',
        'default', 'error', 'warning', 'info', 'success',
        'bare', 'iconic', 'filled', 'outlined', 'text'
      ];

      const sizePatterns = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

      const variants = classes
        .filter(c => c.startsWith('-'))
        .map(c => c.substring(1))
        .filter(c => variantPatterns.includes(c));

      const sizes = classes
        .filter(c => c.startsWith('-'))
        .map(c => c.substring(1))
        .filter(c => sizePatterns.includes(c));

      return {
        variants: variants.length > 0 ? variants : ['default'],
        sizes: sizes.length > 0 ? sizes : ['default']
      };
    }

    horizonComponents.forEach(componentName => {
      const elementsInMain = Array.from(document.querySelectorAll(componentName));
      const elementsInShadow = searchInShadowDOM(document, componentName);
      const allElements = [...elementsInMain, ...elementsInShadow];

      if (allElements.length > 0) {
        const instances = allElements.map(el => {
          // Look for variants in shadow root children (like <button> inside <now-button>)
          let actualElement = el;
          if (el.shadowRoot) {
            const firstChild = el.shadowRoot.querySelector('button, input, select, div[class*="now-"]');
            if (firstChild) {
              actualElement = firstChild;
            }
          }

          const className = actualElement.className || '';
          const parsed = parseClasses(className);

          return {
            tagName: el.tagName.toLowerCase(),
            className: className,
            attributes: Object.fromEntries(
              Array.from(el.attributes).map(attr => [attr.name, attr.value])
            ),
            ...parsed,
            hasIcon: el.hasAttribute('icon') || el.getAttribute('icon') !== null,
            disabled: el.hasAttribute('disabled') || actualElement.hasAttribute('disabled'),
            ariaLabel: el.getAttribute('aria-label') || actualElement.getAttribute('aria-label')
          };
        });

        // Aggregate all unique variants and sizes
        const allVariants = [...new Set(instances.flatMap(i => i.variants))];
        const allSizes = [...new Set(instances.flatMap(i => i.sizes))];

        // Count distribution
        const variantCounts = {};
        const sizeCounts = {};

        instances.forEach(inst => {
          inst.variants.forEach(v => {
            variantCounts[v] = (variantCounts[v] || 0) + 1;
          });
          inst.sizes.forEach(s => {
            sizeCounts[s] = (sizeCounts[s] || 0) + 1;
          });
        });

        componentResults[componentName] = {
          count: allElements.length,
          countInMain: elementsInMain.length,
          countInShadow: elementsInShadow.length,
          variants: allVariants,
          sizes: allSizes,
          variantDistribution: variantCounts,
          sizeDistribution: sizeCounts,
          instances: instances.slice(0, 5), // Sample first 5
          hasIcons: instances.filter(i => i.hasIcon).length,
          hasDisabled: instances.filter(i => i.disabled).length
        };
      }
    });

    return componentResults;
  }, config.horizonComponents);
}

/**
 * Generate enhanced markdown report
 */
function generateEnhancedReport(reportDir, pageUrl, components) {
  const reportPath = path.join(reportDir, 'enhanced-analysis.md');
  const totalComponents = Object.values(components).reduce((sum, c) => sum + c.count, 0);

  let report = `# Enhanced Horizon Component Analysis

**Page:** ${pageUrl}
**Date:** ${getReadableTimestamp()}
**Total Components:** ${totalComponents}
**Component Types:** ${Object.keys(components).length}

---

## 🎯 Key Findings

### Variant Usage Summary

`;

  // Overall variant usage
  const allVariants = {};
  Object.entries(components).forEach(([name, data]) => {
    Object.entries(data.variantDistribution).forEach(([variant, count]) => {
      allVariants[variant] = (allVariants[variant] || 0) + count;
    });
  });

  report += `| Variant | Usage Count | Percentage |\n`;
  report += `|---------|-------------|------------|\n`;

  const sortedVariants = Object.entries(allVariants).sort((a, b) => b[1] - a[1]);
  sortedVariants.forEach(([variant, count]) => {
    const pct = ((count / totalComponents) * 100).toFixed(1);
    report += `| ${variant} | ${count} | ${pct}% |\n`;
  });

  report += `\n### Size Usage Summary\n\n`;

  // Overall size usage
  const allSizes = {};
  Object.entries(components).forEach(([name, data]) => {
    Object.entries(data.sizeDistribution).forEach(([size, count]) => {
      allSizes[size] = (allSizes[size] || 0) + count;
    });
  });

  report += `| Size | Usage Count | Percentage |\n`;
  report += `|------|-------------|------------|\n`;

  const sortedSizes = Object.entries(allSizes).sort((a, b) => b[1] - a[1]);
  sortedSizes.forEach(([size, count]) => {
    const pct = ((count / totalComponents) * 100).toFixed(1);
    report += `| ${size} | ${count} | ${pct}% |\n`;
  });

  report += `\n---\n\n## 📊 Component Breakdown\n\n`;

  // Detailed component analysis
  Object.entries(components).forEach(([name, data]) => {
    report += `### ${name}\n\n`;
    report += `- **Total Count:** ${data.count} (Main: ${data.countInMain}, Shadow: ${data.countInShadow})\n`;
    report += `- **Variants Found:** ${data.variants.join(', ')}\n`;
    report += `- **Sizes Found:** ${data.sizes.join(', ')}\n`;
    report += `- **With Icons:** ${data.hasIcons}\n`;
    report += `- **Disabled:** ${data.hasDisabled}\n\n`;

    report += `**Variant Distribution:**\n`;
    Object.entries(data.variantDistribution).forEach(([variant, count]) => {
      report += `  - ${variant}: ${count} (${((count/data.count)*100).toFixed(1)}%)\n`;
    });

    report += `\n**Size Distribution:**\n`;
    Object.entries(data.sizeDistribution).forEach(([size, count]) => {
      report += `  - ${size}: ${count} (${((count/data.count)*100).toFixed(1)}%)\n`;
    });

    // Sample instances
    if (data.instances.length > 0) {
      report += `\n**Sample Instances:**\n\n`;
      data.instances.forEach((inst, idx) => {
        report += `${idx + 1}. Variant: ${inst.variants.join(', ')} | Size: ${inst.sizes.join(', ')}`;
        if (inst.ariaLabel) report += ` | Label: "${inst.ariaLabel}"`;
        if (inst.hasIcon) report += ` | Has Icon`;
        if (inst.disabled) report += ` | Disabled`;
        report += `\n`;
      });
    }

    report += `\n---\n\n`;
  });

  // Design System Compliance Analysis
  report += `## 🎨 Design System Compliance Analysis\n\n`;

  // Button analysis
  if (components['now-button']) {
    const btnData = components['now-button'];
    report += `### Button Hierarchy\n\n`;

    const hasPrimary = btnData.variantDistribution['primary'] || 0;
    const hasSecondary = btnData.variantDistribution['secondary'] || 0;
    const hasTertiary = btnData.variantDistribution['tertiary'] || 0;

    if (hasPrimary > 0 && hasSecondary > 0) {
      report += `✅ **Good:** Clear button hierarchy with primary (${hasPrimary}) and secondary (${hasSecondary}) variants\n\n`;
    } else if (hasPrimary > 0) {
      report += `✅ **Good:** Primary buttons detected (${hasPrimary})\n\n`;
    } else if (btnData.variantDistribution['default'] === btnData.count) {
      report += `⚠️ **Review:** All buttons using default variant - consider explicit hierarchy\n\n`;
    }
  }

  // Size consistency
  report += `### Size Consistency\n\n`;
  const uniqueSizes = Object.keys(allSizes);
  if (uniqueSizes.length <= 3) {
    report += `✅ **Good:** Limited size variations (${uniqueSizes.join(', ')}) - promotes consistency\n\n`;
  } else {
    report += `⚠️ **Review:** Multiple size variations (${uniqueSizes.join(', ')}) - verify intentional\n\n`;
  }

  report += `## 💡 Recommendations\n\n`;
  report += `1. Review components with 'default' variant to ensure proper semantic variants\n`;
  report += `2. Verify size consistency aligns with design system guidelines\n`;
  report += `3. Check disabled states for accessibility compliance\n`;
  report += `4. Validate icon usage follows Horizon icon library\n`;
  report += `5. Ensure ARIA labels present on icon-only buttons\n`;

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Enhanced report saved: enhanced-analysis.md`);

  return reportPath;
}

/**
 * Main enhanced extraction runner
 */
async function runEnhancedExtraction() {
  console.log('🚀 Starting Enhanced Component Extraction\n');

  if (!config.instance || !config.username || !config.password) {
    console.error('❌ Missing ServiceNow configuration in .env file');
    process.exit(1);
  }

  const reportDir = path.join(process.cwd(), 'reports', 'enhanced-' + getLocalTimestamp());

  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const browser = await puppeteer.launch(config.puppeteerOptions);

  try {
    const page = await browser.newPage();
    await loginToServiceNow(page);

    const testPage = config.testPages[0];
    const fullUrl = `${config.getBaseUrl()}${testPage}`;

    console.log(`📄 Analyzing page: ${testPage}\n`);

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: config.timeouts.navigation
    });

    await sleep(config.timeouts.componentLoad + 5000);

    console.log('📊 Extracting components with variant/size detection...\n');
    const components = await extractEnhancedComponents(page);

    // Display summary
    console.log('Component Summary:');
    Object.entries(components).forEach(([name, data]) => {
      console.log(`  ${name}: ${data.count} instances`);
      console.log(`    Variants: ${data.variants.join(', ')}`);
      console.log(`    Sizes: ${data.sizes.join(', ')}`);
    });

    // Save detailed JSON
    const jsonPath = path.join(reportDir, 'components-detailed.json');
    fs.writeFileSync(jsonPath, JSON.stringify(components, null, 2));
    console.log(`\n💾 JSON data saved: components-detailed.json`);

    // Generate markdown report
    generateEnhancedReport(reportDir, fullUrl, components);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Enhanced Extraction Complete!');
    console.log('='.repeat(60));
    console.log(`\n📁 Location: ${reportDir}`);

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

runEnhancedExtraction();
