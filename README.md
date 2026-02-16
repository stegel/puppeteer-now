# ServiceNow Horizon Design System Validator

Automated testing tool using Puppeteer to validate Horizon Design System implementation across ServiceNow instances. Detects proper component usage, identifies custom/non-Horizon patterns, and audits design system compliance. **Now with Figma integration for design-to-implementation comparison!**

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file with your ServiceNow credentials:

```bash
cp .env.example .env
```

Edit `.env` with your instance details:

```env
SN_INSTANCE=your-instance-name
SN_USERNAME=your-username
SN_PASSWORD=your-password
```

### 3. Run Tests

```bash
# Run basic validation across all test pages
npm test

# Run deep component audit on first test page
npm run test:components

# Run diagnostic analysis
npm run diagnostic

# Compare to Figma design system
npm run compare-figma <figma-file-url>
```

## Features

### ✅ Horizon Component Validation
- Detects all Horizon Design System components (now-button, now-input, etc.)
- **Recursively searches Shadow DOM** for nested components
- Counts component usage across pages
- Extracts component attributes, variants, and states
- Works with macroponent and seismic-hoist wrappers

### 🎨 Figma Design System Comparison
- Extracts live component implementations from ServiceNow
- Integrates with Figma MCP for design system access
- Compares implementation vs design specifications
- Identifies variant mismatches and deviations
- Generates detailed comparison reports

### 📸 Screenshot Capture
- Automatic full-page screenshots for every page tested
- Timestamped folders (YYYY-MM-DD_HH-MM-SS)
- Stored in `./screenshots` directory
- Useful for visual regression testing

### 🔍 Custom Pattern Detection
- Identifies non-Horizon UI elements (custom buttons, inputs, etc.)
- Reports compliance violations
- Helps migration planning from legacy UI

### 📊 Deep Component Audit
- Walks entire DOM tree (including Shadow DOM)
- Extracts component hierarchy and relationships
- Analyzes usage patterns
- Generates detailed inventory reports

### 🔬 Diagnostic Analysis
- Analyzes page structure and Shadow DOM
- Detects custom elements and UI frameworks
- Identifies ServiceNow UI patterns (Polaris, Seismic, etc.)
- Provides recommendations for validator configuration

## Configuration

All settings are managed in `config.js`:

- **Test Pages**: Add/remove pages to audit in `config.testPages`
- **Components**: Customize Horizon components in `config.horizonComponents`
- **Custom Patterns**: Define non-Horizon selectors in `config.customPatterns`
- **Timeouts**: Adjust for slower instances in `config.timeouts`

## Project Structure

```
servicenow-horizon-validator/
├── config.js              # Central configuration
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (not in git)
├── .claude/
│   └── skills/           # Claude Code skills
│       ├── validate-horizon.md
│       └── compare-to-figma.md
├── tests/
│   ├── horizon-validator.js   # Main validation runner
│   ├── component-audit.js     # Deep component analysis
│   ├── diagnostic.js          # Page structure analysis
│   └── compare-to-figma.js    # Figma comparison tool
├── utils/
│   └── auth.js            # ServiceNow authentication
├── screenshots/           # Timestamped screenshots (generated)
└── reports/              # Comparison reports (generated)
```

## Example Output

### Validation Report
```
============================================================
📋 COMPLIANCE REPORT: /now/sow/home
============================================================

✅ Horizon components detected: 11 types (97 total)
⚠️ Custom/non-Horizon elements: 0 total

🎉 EXCELLENT! This page is fully Horizon-compliant!
============================================================
```

### Component Inventory
```
📊 Auditing Horizon components (including Shadow DOM)...
  ✅ now-button: 5 total (Main: 0, Shadow DOM: 5)
  ✅ now-input: 1 total (Main: 0, Shadow DOM: 1)
  ✅ now-dropdown: 6 total (Main: 0, Shadow DOM: 6)
  ✅ now-icon: 47 total (Main: 0, Shadow DOM: 47)
  ✅ now-tabs: 2 total (Main: 0, Shadow DOM: 2)
```

## Shadow DOM Support

ServiceNow's Horizon components are nested inside Shadow DOM. This tool:
1. Recursively traverses all Shadow DOM trees
2. Searches inside macroponent wrappers
3. Pierces seismic-hoist elements
4. Finds deeply nested Horizon components

**Without Shadow DOM support:** 0 components detected
**With Shadow DOM support:** 97+ components detected ✅

## Figma Integration (Claude Skills)

This project includes Claude Code skills for Figma integration:

### Using the Skills

In Claude Code, you can say:
- "Compare the Service Operations Workspace to our Figma design system"
- "Validate our now-button implementations against Figma"
- "Check if the incident form matches the Figma specs"

### Manual Comparison Workflow

1. Run the comparison tool:
```bash
npm run compare-figma https://www.figma.com/file/your-file-id
```

2. The tool generates:
   - Component inventory JSON
   - Screenshots
   - Markdown report with Figma integration instructions

3. Use Claude with Figma MCP to:
   - Fetch Figma design system components
   - Compare variants, properties, and states
   - Generate detailed compliance report

## Customization

### Add New Test Pages

Edit `config.js`:

```javascript
testPages: [
  '/now/sow/home',
  '/your/custom/page.do'
]
```

### Add Custom Component Types

```javascript
horizonComponents: [
  'now-button',
  'your-custom-component'
]
```

### Modify Puppeteer Behavior

```javascript
puppeteerOptions: {
  headless: true,  // Run without browser UI
  defaultViewport: { width: 1920, height: 1080 }
}
```

## Development

### Debug Mode
Set `headless: false` in `config.js` to see browser actions in real-time.

### Extend Functionality
- Add screenshot comparison between runs
- Export reports to JSON/CSV
- Integrate with CI/CD pipeline
- Add accessibility compliance checks
- Create visual regression testing

## Requirements

- Node.js 18+ or 20+
- ServiceNow instance with Horizon Design System
- (Optional) Figma MCP server for design comparison

## License

MIT

## Contributing

Contributions welcome! This tool supports the Design Linting and Automated UI Testing initiatives.
