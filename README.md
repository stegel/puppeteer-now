# ServiceNow Horizon Design System Validator

Automated testing tool using Puppeteer to validate Horizon Design System implementation across ServiceNow instances. Detects proper component usage, identifies custom/non-Horizon patterns, and audits design system compliance.

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
```

## Features

### Horizon Component Validation
- Detects all Horizon Design System components (now-button, now-input, etc.)
- Counts component usage across pages
- Extracts component attributes and styles

### Custom Pattern Detection
- Identifies non-Horizon UI elements (custom buttons, inputs, etc.)
- Reports compliance violations
- Helps migration planning

### Deep Component Audit
- Walks entire DOM tree
- Extracts component hierarchy and relationships
- Analyzes usage patterns
- Generates detailed inventory reports

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
├── tests/
│   ├── horizon-validator.js   # Main validation runner
│   └── component-audit.js     # Deep component analysis
└── utils/
    └── auth.js            # ServiceNow authentication
```

## Example Output

### Validation Report
```
============================================================
📋 COMPLIANCE REPORT: /now/workspace/agent/record/incident/new
============================================================

✅ Horizon components detected: 8 types
⚠️ Custom/non-Horizon elements: 3 total

👍 GOOD. Mostly using Horizon, but some custom elements detected.
============================================================
```

### Component Inventory
```
📦 COMPONENT INVENTORY REPORT
================================================================================
📊 Total Horizon components: 47
📊 Unique component types: 8

🔷 NOW-BUTTON (12 instances)
  Instance #1:
    Parent: <div>
    Attributes:
      variant="primary"
      size="md"
```

## Customization

### Add New Test Pages

Edit `config.js`:

```javascript
testPages: [
  '/your/custom/page.do',
  '/another/page.do'
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
- Add screenshot capture for visual regression
- Export reports to JSON/CSV
- Integrate with CI/CD pipeline
- Add accessibility compliance checks

## License

MIT
