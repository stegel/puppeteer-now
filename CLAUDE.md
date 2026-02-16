# ServiceNow Horizon Design System Validator

## Project Overview
Automated testing tool using Puppeteer to validate Horizon Design System implementation across ServiceNow instances. Detects proper component usage, identifies custom/non-Horizon patterns, and audits design system compliance.

## Tech Stack
- Node.js (ES modules)
- Puppeteer for browser automation
- ServiceNow instances (web components)

## Project Structure
servicenow-horizon-validator/
├── config.js              # Instance configuration and component definitions
├── package.json           # Dependencies and npm scripts
├── tests/
│   ├── horizon-validator.js   # Main validation runner
│   └── component-audit.js     # Deep component tree analysis
└── utils/
└── auth.js            # ServiceNow authentication helpers

# ServiceNow Horizon Design System Validator

## Project Overview
Automated testing tool using Puppeteer to validate Horizon Design System implementation across ServiceNow instances. Detects proper component usage, identifies custom/non-Horizon patterns, and audits design system compliance.

## Tech Stack
- Node.js (ES modules)
- Puppeteer for browser automation
- ServiceNow instances (web components)

## Project Structure
```
servicenow-horizon-validator/
├── config.js              # Instance configuration and component definitions
├── package.json           # Dependencies and npm scripts
├── tests/
│   ├── horizon-validator.js   # Main validation runner
│   └── component-audit.js     # Deep component tree analysis
└── utils/
    └── auth.js            # ServiceNow authentication helpers
```

## Key Files

### config.js
Central configuration for easy instance switching. Contains:
- Instance URL configuration (currently: empasiegelplay)
- Horizon component selectors (now-button, now-input, etc.)
- Test page routes
- Authentication credentials (use env vars in production)

### tests/horizon-validator.js
Main test runner that:
- Logs into ServiceNow instance
- Iterates through configured test pages
- Audits Horizon component usage with counts and styles
- Detects custom/non-Horizon patterns (buttons, inputs outside Horizon)
- Reports compliance status

### tests/component-audit.js
Deep component analysis that:
- Walks the entire DOM tree
- Extracts all Horizon web components
- Reports component hierarchy with attributes
- Provides detailed inventory for design system compliance

## Development Conventions

### Code Style
- ES modules (import/export)
- Async/await for all Puppeteer operations
- Descriptive function names (auditHorizonComponents, findCustomPatterns)
- Console logging with emoji indicators (✅ ❌ ⚠️ 📊)

### Configuration Pattern
All instance-specific settings live in config.js for easy switching:
```javascript
instance: 'empasiegelplay'  // Change this to switch instances
```

### Testing Pattern
1. Login to ServiceNow
2. Navigate to target page
3. Wait for components to load
4. Query DOM for Horizon components
5. Identify non-compliant patterns
6. Report results

## Running the Project
```bash
# Install dependencies
npm install

# Run basic validation across all test pages
npm test

# Run deep component audit on first test page
npm run test:components
```

## Environment Variables (for production)
```
SN_USERNAME=your-username
SN_PASSWORD=your-password
```

## Extension Ideas
- [ ] Screenshot comparison against golden images
- [ ] Design token validation (colors, typography, spacing)
- [ ] Accessibility compliance checks (ARIA, keyboard nav)
- [ ] Export reports to JSON/CSV
- [ ] Integration with CI/CD pipeline
- [ ] Visual regression testing
- [ ] Custom component pattern library

## ServiceNow Context
This tool supports the Design Linting and Automated UI Testing initiatives in the Experience (EX) Design organization. It helps ensure products properly implement the Horizon Design System rather than building custom components.

## Notes for Claude Code
- When adding new component types, update `config.horizonComponents`
- When adding new test pages, update `config.testPages`
- Keep authentication helpers in utils/auth.js for reusability
- Maintain headless: false during development for visibility
- Consider adding timeout configurations for slower instances
