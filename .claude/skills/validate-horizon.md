# Validate Horizon Design System Implementation

## Description
Runs Puppeteer-based validation on ServiceNow instances to detect Horizon Design System component usage, including components nested in Shadow DOM. Generates compliance reports and screenshots.

## When to Use
- User says "validate", "check horizon", "audit components"
- User wants to know which Horizon components are used on a page
- User needs compliance reporting
- User wants screenshots of ServiceNow pages

## What This Skill Does
- Logs into ServiceNow instance configured in .env
- Navigates to specified pages (or all pages in config)
- Recursively searches Shadow DOM for Horizon components
- Detects custom/non-Horizon patterns
- Takes full-page screenshots in timestamped folders
- Generates compliance reports

## Input Parameters
- **Page URL** (optional): Specific ServiceNow page to validate
- **Screenshot Only** (optional): Just capture screenshot without validation
- **Component Filter** (optional): Only look for specific component types

## Output
- Horizon component inventory (by type and count)
- Split between Main DOM vs Shadow DOM
- Custom element detection (non-Horizon patterns)
- Compliance rating (Excellent/Good/Warning)
- Screenshots in ./screenshots/[timestamp]/
- Console report with recommendations

## Available Commands
```bash
# Validate all configured pages
npm test

# Deep component audit (first page only)
npm run test:components

# Diagnostic analysis
npm run diagnostic
```

## Example Usage
```
User: "Validate the Service Operations Workspace"
User: "Check what Horizon components are on the incident form"
User: "Run a full audit and show me screenshots"
```

## Component Detection
Detects these Horizon components (including Shadow DOM):
- now-button, now-input, now-textarea, now-dropdown
- now-modal, now-card, now-alert, now-icon
- now-tabs, now-toggle, now-checkbox, now-radio
- now-popover, now-tooltip, now-table
- now-avatar, now-badge, now-progress, now-loader

## Technical Notes
- Uses recursive Shadow DOM traversal
- Handles macroponent and seismic-hoist wrappers
- Screenshots saved as PNG with full page capture
- Works with ServiceNow credentials from .env file
