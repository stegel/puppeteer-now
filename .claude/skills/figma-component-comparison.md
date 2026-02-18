# Figma Component Comparison Workflow

## Overview
This skill helps compare ServiceNow Horizon component implementations against their corresponding Figma design specifications. Each Horizon component has a dedicated page in the Figma design library.

## Prerequisites
- Figma file has component pages (e.g., "Button" page, "Input" page, etc.)
- figma-component-mapping.json is configured with correct page names and node IDs
- Figma Desktop is open (for selection-based comparison)

## Component Mapping

The mapping file (`figma-component-mapping.json`) defines:
- **ServiceNow component name** → **Figma page name**
- **Component node ID** in Figma (for direct access)
- **Expected variants** and **sizes** from design system

## Workflow Options

### Option 1: Manual Selection (Figma Desktop)

**Best for:** Ad-hoc comparisons, exploring designs

1. **Extract ServiceNow data:**
   ```bash
   npm run extract-enhanced
   ```

2. **For each component:**
   - Open Figma Desktop
   - Navigate to component's page (e.g., "Button" page)
   - Select the component frame
   - Ask Claude: "Compare the selected Figma component to ServiceNow implementation"

3. **Claude will:**
   - Use Figma MCP `get_design_context` on selected component
   - Load ServiceNow extraction data
   - Compare variants, sizes, attributes
   - Generate comparison report

### Option 2: Automated by Node ID

**Best for:** Batch comparisons, CI/CD integration

1. **One-time setup - Populate node IDs:**
   - Open Figma Desktop
   - For each component page:
     - Select main component frame
     - Copy node ID (from URL or selection info)
     - Update `figma-component-mapping.json`

2. **Run comparison:**
   ```bash
   npm run compare-figma <figma-file-url>
   ```
   Or ask Claude: "Compare all components to Figma using the mapping file"

3. **Claude will:**
   - Read component mapping
   - For each ServiceNow component:
     - Fetch Figma specs using nodeId
     - Load ServiceNow data
     - Compare and report deviations
   - Generate comprehensive comparison report

### Option 3: Page-by-Page (Recommended for Initial Audit)

**Best for:** Thorough review, documentation

For each component type:

1. **Extract ServiceNow component:**
   ```bash
   npm run extract-enhanced
   ```
   Review: reports/enhanced-*/enhanced-analysis.md

2. **Review Figma page:**
   - Open component's Figma page
   - Select component
   - Ask: "Show me the design specs for this component"

3. **Compare:**
   - Ask: "Compare now-button implementation to the selected Figma component"
   - Claude generates side-by-side comparison

4. **Iterate** through all component types

## Comparison Criteria

For each component, Claude checks:

### Variants
- ✅ Are all Figma variants used in ServiceNow?
- ⚠️ Are extra variants used (not in Figma)?
- ❌ Are required variants missing?

### Sizes
- ✅ Do sizes match Figma specs?
- ⚠️ Are non-standard sizes used?
- ❌ Are size options missing?

### Visual Attributes
- Colors (background, border, text)
- Spacing (padding, margins)
- Typography (font, size, weight)
- Shadows and effects
- Border radius

### States
- Default, hover, active, disabled, focus
- Error, warning, success states
- Loading states

### Accessibility
- ARIA attributes
- Focus indicators
- Color contrast
- Keyboard navigation

## Example Commands

### Single Component
```
"Compare now-button to Figma Button page"
"Check if our dropdowns match the Figma specs"
"Show me differences between ServiceNow tabs and Figma design"
```

### Batch Comparison
```
"Compare all buttons to Figma and show variant usage"
"Audit all form components against Figma library"
"Generate comparison report for all components"
```

### Visual Comparison
```
"Show me screenshots of ServiceNow button vs Figma button"
"Generate visual comparison for now-dropdown"
"Create side-by-side comparison with screenshots"
```

## Output

Claude generates:

1. **Variant Comparison Table**
   | Variant | Figma Spec | ServiceNow Usage | Status |
   |---------|-----------|------------------|--------|
   | primary | ✓ Defined | 1 instance | ✅ Match |
   | secondary | ✓ Defined | 2 instances | ✅ Match |

2. **Size Comparison**
   - Expected sizes from Figma
   - Actual sizes in ServiceNow
   - Missing or extra sizes

3. **Visual Deviation Report**
   - Color differences
   - Spacing discrepancies
   - Typography variations

4. **Recommendations**
   - Components needing updates
   - Variants to add/remove
   - Sizing adjustments

## Configuring the Mapping File

Edit `figma-component-mapping.json`:

```json
{
  "now-button": {
    "figmaPageName": "Button",           // Name of Figma page
    "figmaPageId": "123:456",            // Page node ID (optional)
    "figmaComponentNodeId": "123:789",   // Main component frame ID
    "variants": ["primary", "secondary"], // Expected variants
    "sizes": ["sm", "md", "lg"]          // Expected sizes
  }
}
```

**To find node IDs:**
1. Select component in Figma Desktop
2. Check URL: `node-id=123-456` → convert to `123:456`
3. Or use Figma plugin to copy node ID

## Tips

- **Start with one component** (e.g., Button) to validate workflow
- **Update mapping file** as you go with correct node IDs
- **Use screenshots** for visual validation alongside data comparison
- **Document deviations** in the comparison reports
- **Share reports** with design and development teams

## Troubleshooting

**Issue:** "Component not found in mapping"
- Add component to `figma-component-mapping.json`

**Issue:** "Cannot access Figma node"
- Verify node ID is correct
- Check Figma file permissions
- Ensure Figma MCP is connected

**Issue:** "No Figma page found"
- Verify page name matches exactly (case-sensitive)
- Check if page exists in Figma file

**Issue:** "Variants don't match"
- This may be expected - document the deviation
- Update mapping file with actual Figma variants
- Discuss with design team if changes needed
