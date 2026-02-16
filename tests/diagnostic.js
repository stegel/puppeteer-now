import puppeteer from 'puppeteer';
import { config } from '../config.js';
import { loginToServiceNow } from '../utils/auth.js';
import fs from 'fs';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Diagnostic script to inspect page structure and detect Shadow DOM
 */
async function runDiagnostic() {
  console.log('🔬 Starting Diagnostic Analysis\n');

  if (!config.instance || !config.username || !config.password) {
    console.error('❌ Missing configuration');
    process.exit(1);
  }

  const browser = await puppeteer.launch(config.puppeteerOptions);

  try {
    const page = await browser.newPage();
    await loginToServiceNow(page);

    // Test the SOW home page (should have Horizon components)
    const testPage = '/now/sow/home';
    const fullUrl = `${config.getBaseUrl()}${testPage}`;

    console.log(`📄 Analyzing page: ${testPage}\n`);

    await page.goto(fullUrl, {
      waitUntil: 'networkidle2',
      timeout: config.timeouts.navigation
    });

    console.log('⏳ Waiting for page to fully load...\n');
    await sleep(config.timeouts.componentLoad);

    // Additional wait for dynamic content
    await sleep(5000);

    // Take screenshot for visual inspection
    const screenshotDir = path.join(process.cwd(), 'screenshots', 'diagnostic');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
    const screenshotPath = path.join(screenshotDir, 'diagnostic-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

    // Comprehensive page analysis
    const analysis = await page.evaluate((horizonComponents) => {
      const results = {
        customElements: [],
        shadowHosts: [],
        iframes: [],
        horizonComponentsFound: {},
        allCustomTags: new Set(),
        pageInfo: {
          totalElements: 0,
          bodyClasses: document.body?.className || '',
          title: document.title,
          readyState: document.readyState,
          commonTags: {},
          bodyText: document.body?.innerText?.substring(0, 500) || '',
          url: window.location.href
        },
        uiPatterns: {
          polarisClasses: [],
          seismicClasses: [],
          nowClasses: [],
          macroponentClasses: []
        }
      };

      // 1. Find all custom elements (tags with hyphens)
      const allElements = document.querySelectorAll('*');
      results.pageInfo.totalElements = allElements.length;

      allElements.forEach(el => {
        const tagName = el.tagName.toLowerCase();

        // Count common tags
        results.pageInfo.commonTags[tagName] = (results.pageInfo.commonTags[tagName] || 0) + 1;

        if (tagName.includes('-')) {
          results.allCustomTags.add(tagName);

          // Check if it has shadow DOM
          if (el.shadowRoot) {
            results.shadowHosts.push({
              tag: tagName,
              hasShadowRoot: true,
              shadowRootMode: el.shadowRoot.mode,
              childCount: el.shadowRoot.children.length
            });
          }
        }
      });

      // 2. Function to recursively search inside shadow DOMs
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

      // Check for specific Horizon components in main DOM and shadow DOMs
      horizonComponents.forEach(componentName => {
        const elementsInMain = document.querySelectorAll(componentName);
        const elementsInShadow = searchInShadowDOM(document, componentName);

        if (elementsInMain.length > 0 || elementsInShadow.length > 0) {
          results.horizonComponentsFound[componentName] = {
            countInMain: elementsInMain.length,
            countInShadow: elementsInShadow.length,
            totalCount: elementsInMain.length + elementsInShadow.length,
            hasShadowRoot: elementsInMain[0]?.shadowRoot || elementsInShadow[0]?.shadowRoot ? true : false,
            shadowRootMode: (elementsInMain[0]?.shadowRoot || elementsInShadow[0]?.shadowRoot)?.mode || 'none'
          };
        }
      });

      // 3. Look for ServiceNow UI patterns in class names
      allElements.forEach(el => {
        const classList = Array.from(el.classList);
        classList.forEach(className => {
          if (className.includes('polaris') || className.includes('Polaris')) {
            if (results.uiPatterns.polarisClasses.length < 20) {
              results.uiPatterns.polarisClasses.push(className);
            }
          }
          if (className.includes('seismic') || className.includes('Seismic')) {
            if (results.uiPatterns.seismicClasses.length < 20) {
              results.uiPatterns.seismicClasses.push(className);
            }
          }
          if (className.startsWith('now-') || className.startsWith('NOW-')) {
            if (results.uiPatterns.nowClasses.length < 20) {
              results.uiPatterns.nowClasses.push(className);
            }
          }
          if (className.includes('macroponent')) {
            if (results.uiPatterns.macroponentClasses.length < 20) {
              results.uiPatterns.macroponentClasses.push(className);
            }
          }
        });
      });

      // Remove duplicates
      results.uiPatterns.polarisClasses = [...new Set(results.uiPatterns.polarisClasses)];
      results.uiPatterns.seismicClasses = [...new Set(results.uiPatterns.seismicClasses)];
      results.uiPatterns.nowClasses = [...new Set(results.uiPatterns.nowClasses)];
      results.uiPatterns.macroponentClasses = [...new Set(results.uiPatterns.macroponentClasses)];

      // 4. Check for iframes
      const iframes = document.querySelectorAll('iframe');
      iframes.forEach((iframe, idx) => {
        results.iframes.push({
          index: idx,
          src: iframe.src,
          id: iframe.id,
          name: iframe.name
        });
      });

      // Convert Set to Array for JSON serialization
      results.allCustomTags = Array.from(results.allCustomTags);

      return results;
    }, config.horizonComponents);

    // Display results
    console.log('='.repeat(80));
    console.log('📊 DIAGNOSTIC RESULTS');
    console.log('='.repeat(80));

    console.log(`\n📄 Page Info:`);
    console.log(`   Title: ${analysis.pageInfo.title}`);
    console.log(`   URL: ${analysis.pageInfo.url}`);
    console.log(`   Ready State: ${analysis.pageInfo.readyState}`);
    console.log(`   Total Elements: ${analysis.pageInfo.totalElements}`);
    console.log(`   Body Classes: ${analysis.pageInfo.bodyClasses.substring(0, 100)}${analysis.pageInfo.bodyClasses.length > 100 ? '...' : ''}`);

    if (analysis.pageInfo.bodyText.trim()) {
      console.log(`\n📝 Visible Text (first 300 chars):`);
      console.log(`   ${analysis.pageInfo.bodyText.substring(0, 300).replace(/\n/g, ' ')}`);
    }

    console.log(`\n🏗️  Common HTML Tags:`);
    const topTags = Object.entries(analysis.pageInfo.commonTags)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    topTags.forEach(([tag, count]) => {
      console.log(`   • <${tag}>: ${count}`);
    });

    console.log(`\n🏷️  Custom Elements Found: ${analysis.allCustomTags.length}`);
    if (analysis.allCustomTags.length > 0) {
      console.log('   Custom tags on page:');
      analysis.allCustomTags.slice(0, 20).forEach(tag => {
        console.log(`   • ${tag}`);
      });
      if (analysis.allCustomTags.length > 20) {
        console.log(`   ... and ${analysis.allCustomTags.length - 20} more`);
      }
    }

    console.log(`\n👻 Shadow DOM Hosts: ${analysis.shadowHosts.length}`);
    if (analysis.shadowHosts.length > 0) {
      console.log('   Elements with Shadow DOM:');
      analysis.shadowHosts.slice(0, 10).forEach(host => {
        console.log(`   • <${host.tag}> - mode: ${host.shadowRootMode}, children: ${host.childCount}`);
      });
      if (analysis.shadowHosts.length > 10) {
        console.log(`   ... and ${analysis.shadowHosts.length - 10} more`);
      }
    }

    console.log(`\n🔍 Horizon Components Detected: ${Object.keys(analysis.horizonComponentsFound).length}`);
    if (Object.keys(analysis.horizonComponentsFound).length > 0) {
      Object.entries(analysis.horizonComponentsFound).forEach(([component, details]) => {
        console.log(`   ✅ ${component}:`);
        console.log(`      Total: ${details.totalCount} (Main DOM: ${details.countInMain}, Shadow DOM: ${details.countInShadow})`);
        console.log(`      Has Shadow Root: ${details.hasShadowRoot}`);
      });
    } else {
      console.log('   ⚠️  No Horizon components detected');
    }

    console.log(`\n🎨 ServiceNow UI Patterns:`);
    if (analysis.uiPatterns.polarisClasses.length > 0) {
      console.log(`   Polaris classes (${analysis.uiPatterns.polarisClasses.length}):`);
      analysis.uiPatterns.polarisClasses.slice(0, 5).forEach(cls => console.log(`      • ${cls}`));
    }
    if (analysis.uiPatterns.seismicClasses.length > 0) {
      console.log(`   Seismic classes (${analysis.uiPatterns.seismicClasses.length}):`);
      analysis.uiPatterns.seismicClasses.slice(0, 5).forEach(cls => console.log(`      • ${cls}`));
    }
    if (analysis.uiPatterns.nowClasses.length > 0) {
      console.log(`   Now- prefixed classes (${analysis.uiPatterns.nowClasses.length}):`);
      analysis.uiPatterns.nowClasses.slice(0, 5).forEach(cls => console.log(`      • ${cls}`));
    }
    if (analysis.uiPatterns.macroponentClasses.length > 0) {
      console.log(`   Macroponent classes (${analysis.uiPatterns.macroponentClasses.length}):`);
      analysis.uiPatterns.macroponentClasses.slice(0, 5).forEach(cls => console.log(`      • ${cls}`));
    }
    if (analysis.uiPatterns.polarisClasses.length === 0 &&
        analysis.uiPatterns.seismicClasses.length === 0 &&
        analysis.uiPatterns.nowClasses.length === 0 &&
        analysis.uiPatterns.macroponentClasses.length === 0) {
      console.log(`   ⚠️  No ServiceNow design system classes detected`);
    }

    console.log(`\n🖼️  iFrames Found: ${analysis.iframes.length}`);
    if (analysis.iframes.length > 0) {
      analysis.iframes.forEach(iframe => {
        console.log(`   • iframe[${iframe.index}]: ${iframe.src?.substring(0, 60) || 'about:blank'}`);
        console.log(`     id: ${iframe.id || 'none'}, name: ${iframe.name || 'none'}`);
      });
    }

    // Check inside iframes
    if (analysis.iframes.length > 0) {
      console.log('\n🔎 Checking inside iframes for Horizon components...\n');

      for (let i = 0; i < Math.min(analysis.iframes.length, 3); i++) {
        try {
          const frameHandle = await page.frames()[i + 1]; // 0 is main frame
          if (frameHandle) {
            const frameAnalysis = await frameHandle.evaluate((horizonComponents) => {
              const found = {};
              horizonComponents.forEach(componentName => {
                const elements = document.querySelectorAll(componentName);
                if (elements.length > 0) {
                  found[componentName] = {
                    count: elements.length,
                    hasShadowRoot: elements[0].shadowRoot ? true : false
                  };
                }
              });
              return found;
            }, config.horizonComponents);

            if (Object.keys(frameAnalysis).length > 0) {
              console.log(`   📦 Frame ${i}: Found components!`);
              Object.entries(frameAnalysis).forEach(([component, details]) => {
                console.log(`      ✅ ${component}: ${details.count} instances`);
              });
            } else {
              console.log(`   📦 Frame ${i}: No Horizon components`);
            }
          }
        } catch (error) {
          console.log(`   📦 Frame ${i}: Unable to access (cross-origin?)`);
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n💡 Recommendations:');

    if (analysis.shadowHosts.length > 0) {
      console.log('   • Shadow DOM detected - validator needs to pierce shadow roots');
    }
    if (analysis.iframes.length > 0) {
      console.log('   • iFrames detected - validator needs to check inside frames');
    }
    if (analysis.allCustomTags.length === 0) {
      console.log('   • No custom elements found - may need to wait longer for page load');
    }
    if (Object.keys(analysis.horizonComponentsFound).length === 0 && analysis.allCustomTags.length > 0) {
      console.log('   • Custom elements found but not matching Horizon selectors');
      console.log('   • Check if component names are different in this ServiceNow version');
    }

    console.log('\n✅ Diagnostic complete!\n');

  } catch (error) {
    console.error('❌ Fatal error:', error);
  } finally {
    await browser.close();
  }
}

runDiagnostic();
