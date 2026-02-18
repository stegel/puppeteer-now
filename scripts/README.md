# Efficiently Populate Figma Component Mapping

## Quick Start (Interactive Mode)

The fastest way to populate your component mapping:

```bash
npm run update-mapping
```

Then follow the prompts! Keep Figma and your terminal side-by-side:

1. **Terminal shows:** "Navigate to Figma page: 'Input'"
2. **You click:** Input page in Figma sidebar
3. **You copy:** node ID from URL (e.g., `node-id=45-67`)
4. **You paste:** `45-67` in terminal
5. **Repeat** for remaining 10 components (~5 minutes total)

## Batch Mode (Even Faster!)

If you want to collect all node IDs first, then update all at once:

### Step 1: Collect Node IDs

Navigate through each Figma page and note the node IDs:

| Component | Figma Page Name | Node ID (from URL) |
|-----------|----------------|-------------------|
| now-button | Button | 28:12 ✅ (done) |
| now-input | Input | ___ |
| now-dropdown | Dropdown | ___ |
| now-modal | Modal | ___ |
| now-tabs | Tabs | ___ |
| now-toggle | Toggle | ___ |
| now-avatar | Avatar | ___ |
| now-icon | Icon | ___ |
| now-tooltip | Tooltip | ___ |
| now-popover | Popover | ___ |
| now-loader | Loader | ___ |

### Step 2: Batch Update

```bash
node scripts/update-mapping.js \
  now-input:45-67 \
  now-dropdown:52-13 \
  now-modal:61-88 \
  now-tabs:72-99 \
  now-toggle:83-44 \
  now-avatar:94-55 \
  now-icon:105-66 \
  now-tooltip:116-77 \
  now-popover:127-88 \
  now-loader:138-99
```

## How to Find Node IDs in Figma

### Method 1: From Page URL
1. Click on page name in left sidebar (e.g., "Input")
2. Look at browser URL: `...?node-id=45-67`
3. Copy `45-67`

### Method 2: From Component Selection
1. Click on page name in left sidebar
2. Select the main component frame on the page
3. URL updates to show component node ID
4. Copy the node ID

### Method 3: From Figma Info Panel
1. Select a component
2. Open info panel (⌘I or Ctrl+I)
3. Node ID shown in properties

## Tips for Speed

1. **Use keyboard shortcuts:**
   - `Cmd/Ctrl + \` - Toggle sidebar
   - `Arrow keys` - Navigate between pages
   - `Cmd/Ctrl + L` - Focus URL bar (quick copy)

2. **Keep both windows visible:**
   - Figma on one side, terminal on other
   - No need to switch windows

3. **Copy node IDs to a text file first:**
   - Then batch update all at once
   - Easier to verify before updating

4. **Skip components you don't need:**
   - Type `skip` when prompted
   - Update them later if needed

## Verify the Mapping

After updating, check the mapping file:

```bash
cat figma-component-mapping.json
```

All components should have `figmaComponentNodeId` filled in (not `null`).

## Next Steps

Once mapping is complete, you can:

1. **Run automated comparisons:**
   ```bash
   npm run compare-figma
   ```

2. **Compare specific components:**
   - Navigate to component page in Figma
   - Select the component
   - Ask Claude: "Compare this to ServiceNow implementation"

3. **Generate visual comparisons:**
   ```bash
   npm run visual-compare
   ```

## Troubleshooting

**Q: What if I enter the wrong node ID?**
- Just run the script again - it will overwrite the incorrect value

**Q: What if a component spans multiple pages?**
- Use the main component page's node ID (where variants are defined)

**Q: Can I update just one component?**
- Yes! Use batch mode: `node scripts/update-mapping.js now-input:45-67`

**Q: Do I need to populate all components?**
- No, only populate the ones you want to compare
- You can add more later as needed
