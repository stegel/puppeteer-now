#!/usr/bin/env node

/**
 * Helper script to efficiently update figma-component-mapping.json
 *
 * Usage:
 *   node scripts/update-mapping.js
 *
 * Then follow the prompts to enter node IDs for each component page.
 * You can also pass node IDs as arguments for batch update.
 */

import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mappingPath = join(__dirname, '..', 'figma-component-mapping.json');

// Read current mapping
const mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));

// Components that need node IDs
const componentsToUpdate = Object.entries(mapping.componentMapping)
  .filter(([_, config]) => !config.figmaComponentNodeId)
  .map(([name, config]) => ({ name, pageName: config.figmaPageName }));

console.log('\n📋 Figma Component Mapping Updater\n');
console.log(`Found ${componentsToUpdate.length} components to update:\n`);

componentsToUpdate.forEach(({ name, pageName }) => {
  console.log(`  - ${name} (Figma page: "${pageName}")`);
});

console.log('\n📖 Instructions:');
console.log('  1. Open Figma file: Next Experience -> Components');
console.log('  2. Click on each page in the left sidebar');
console.log('  3. Copy the node-id from the URL (e.g., node-id=123-456)');
console.log('  4. Enter it when prompted (you can enter as "123-456" or "123:456")\n');
console.log('  💡 Tip: Keep Figma and terminal side-by-side for efficiency!\n');

// Interactive mode
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let index = 0;

function promptNext() {
  if (index >= componentsToUpdate.length) {
    console.log('\n✅ All components updated!');

    // Save the mapping
    fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
    console.log(`💾 Saved to: ${mappingPath}\n`);

    rl.close();
    return;
  }

  const { name, pageName } = componentsToUpdate[index];

  rl.question(`\n📍 Navigate to Figma page: "${pageName}"\n   Enter node-id for ${name} (or 'skip'): `, (answer) => {
    const trimmed = answer.trim();

    if (trimmed.toLowerCase() === 'skip') {
      console.log('   ⏭️  Skipped');
      index++;
      promptNext();
      return;
    }

    if (!trimmed) {
      console.log('   ⚠️  No input, skipping...');
      index++;
      promptNext();
      return;
    }

    // Convert dash format to colon format (123-456 -> 123:456)
    const nodeId = trimmed.replace('-', ':');

    // Validate format (should be like 123:456)
    if (!/^\d+:\d+$/.test(nodeId)) {
      console.log(`   ❌ Invalid format. Expected format: 123:456 or 123-456`);
      // Don't increment index, ask again
      promptNext();
      return;
    }

    // Update mapping
    mapping.componentMapping[name].figmaComponentNodeId = nodeId;
    console.log(`   ✅ Updated ${name} -> ${nodeId}`);

    index++;
    promptNext();
  });
}

// Check if node IDs were passed as command line arguments
const args = process.argv.slice(2);

if (args.length > 0) {
  console.log('\n📦 Batch update mode\n');

  // Expect format: component-name:node-id component-name:node-id ...
  args.forEach(arg => {
    const [componentName, nodeId] = arg.split(':');
    const formattedNodeId = nodeId.replace('-', ':');

    if (mapping.componentMapping[componentName]) {
      mapping.componentMapping[componentName].figmaComponentNodeId = formattedNodeId;
      console.log(`✅ Updated ${componentName} -> ${formattedNodeId}`);
    } else {
      console.log(`❌ Unknown component: ${componentName}`);
    }
  });

  fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2) + '\n');
  console.log(`\n💾 Saved to: ${mappingPath}\n`);
  rl.close();
} else {
  // Interactive mode
  promptNext();
}
