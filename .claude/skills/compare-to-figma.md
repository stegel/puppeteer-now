# Compare ServiceNow Implementation to Figma Design System

## Description
Validates ServiceNow Horizon Design System implementation and compares it against the reference Figma design library. Identifies design deviations, missing components, and implementation issues.

## When to Use
- User says "compare to Figma", "check against design", "validate design system"
- User wants to verify Horizon component implementation matches Figma specs
- User needs a design compliance report
- User mentions Figma + ServiceNow together

## Prerequisites
- Figma MCP server must be configured
- ServiceNow credentials in .env file
- Figma file URL or file key for reference design system

## What This Skill Does

### 1. Capture Live Implementation
- Runs Puppeteer validator on specified ServiceNow pages
- Takes screenshots of each page
- Extracts all Horizon components with attributes
- Documents component counts and usage patterns

### 2. Fetch Figma Design Specs
- Connects to Figma design system library
- Retrieves component definitions and properties
- Captures design tokens (colors, spacing, typography)
- Gets variant specifications

### 3. Compare & Report
- Matches implemented components to Figma designs
- Identifies deviations in:
  - Component usage (wrong variants, missing props)
  - Visual styling (colors, sizes, spacing)
  - Component hierarchy
  - Missing or extra components
- Generates detailed compliance report
- Highlights areas needing design system updates

## Input Parameters
- **ServiceNow Page URL** (optional): Specific page to validate, defaults to config.testPages
- **Figma File URL** (required): URL to Horizon Design System Figma file
- **Component Filter** (optional): Focus on specific component types (e.g., "now-button", "now-tabs")

## Output
- Summary of Horizon components found
- Figma design system components catalog
- Comparison report with deviations
- Screenshots with annotations
- Recommendations for remediation

## Example Usage
```
User: "Compare the Service Operations Workspace to our Figma design system"
User: "Check if the incident form matches the Figma specs"
User: "Validate our now-button implementations against Figma"
```

## Implementation Steps

1. **Run Validation**
   ```bash
   npm test
   # or target specific page
   ```

2. **Access Figma via MCP**
   - Use Figma MCP to fetch file contents
   - Extract component definitions
   - Get design tokens and specs

3. **Analysis**
   - Map ServiceNow components to Figma components
   - Compare attributes, variants, states
   - Check visual properties against design tokens
   - Identify missing or incorrect usage

4. **Generate Report**
   - Create markdown report with findings
   - Include screenshots with annotations
   - Provide actionable recommendations
   - Calculate compliance score

## Technical Notes
- Uses existing tests/horizon-validator.js for component detection
- Leverages Figma MCP for design system access
- Requires matching component naming conventions
- Screenshots stored in ./screenshots with timestamps
- Report generated in ./reports directory
