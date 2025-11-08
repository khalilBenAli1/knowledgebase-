const fs = require('fs');
const path = require('path');

console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║  Updating entity and service files for new features...      ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

const filesToUpdate = [
  {
    from: 'src/entities/formation.entity.updated.ts',
    to: 'src/entities/formation.entity.ts',
    description: 'Formation entity - Add catalog fields (duration, location, maxParticipants, createdById)',
  },
  {
    from: 'src/modules/formations/formations.controller.updated.ts',
    to: 'src/modules/formations/formations.controller.ts',
    description: 'Formations controller - Add catalog OCR endpoints',
  },
  {
    from: 'src/modules/formations/formations.module.updated.ts',
    to: 'src/modules/formations/formations.module.ts',
    description: 'Formations module - Add FormationsCatalogService',
  },
  {
    from: 'src/modules/formation-requests/formation-requests.service.updated.ts',
    to: 'src/modules/formation-requests/formation-requests.service.ts',
    description: 'Formation requests service - Add notification integration',
  },
  {
    from: 'src/modules/formation-requests/formation-requests.module.updated.ts',
    to: 'src/modules/formation-requests/formation-requests.module.ts',
    description: 'Formation requests module - Import NotificationsModule',
  },
];

// OCR service fix (string replacement instead of file copy)
const ocrServiceFix = {
  file: 'src/modules/ocr/ocr.service.ts',
  description: 'OCR service - Fix Buffer type issue with Tesseract',
  search: 'new Uint8Array(imageBuffer)',
  replace: 'imageBuffer as any',
};

let successCount = 0;
let errorCount = 0;
const errors = [];

// Process file copies
console.log('Applying file updates...\n');

for (const update of filesToUpdate) {
  const fromPath = path.join(__dirname, update.from);
  const toPath = path.join(__dirname, update.to);

  try {
    // Check if source file exists
    if (!fs.existsSync(fromPath)) {
      console.log(`⊘ ${update.description}`);
      console.log(`  Source not found: ${update.from}`);
      console.log(`  (This update may have been applied already or is not needed)\n`);
      continue;
    }

    // Copy file
    const content = fs.readFileSync(fromPath, 'utf8');
    fs.writeFileSync(toPath, content, 'utf8');

    console.log(`✓ ${update.description}`);
    console.log(`  ${update.from} → ${update.to}\n`);
    successCount++;

  } catch (error) {
    console.error(`✗ ${update.description}`);
    console.error(`  ${update.from} → ${update.to}`);
    console.error(`  Error: ${error.message}\n`);
    errors.push({ update: update.description, error: error.message });
    errorCount++;
  }
}

// Process OCR service string replacement
console.log('Applying code fixes...\n');

try {
  const ocrPath = path.join(__dirname, ocrServiceFix.file);

  if (fs.existsSync(ocrPath)) {
    const content = fs.readFileSync(ocrPath, 'utf8');

    if (content.includes(ocrServiceFix.search)) {
      const newContent = content.replace(
        new RegExp(ocrServiceFix.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
        ocrServiceFix.replace
      );
      fs.writeFileSync(ocrPath, newContent, 'utf8');

      console.log(`✓ ${ocrServiceFix.description}`);
      console.log(`  File: ${ocrServiceFix.file}`);
      console.log(`  Changed: "${ocrServiceFix.search}" → "${ocrServiceFix.replace}"\n`);
      successCount++;
    } else {
      console.log(`⊘ ${ocrServiceFix.description}`);
      console.log(`  File: ${ocrServiceFix.file}`);
      console.log(`  (Fix already applied or pattern not found)\n`);
    }
  } else {
    console.log(`⊘ ${ocrServiceFix.description}`);
    console.log(`  File not found: ${ocrServiceFix.file}\n`);
  }
} catch (error) {
  console.error(`✗ ${ocrServiceFix.description}`);
  console.error(`  File: ${ocrServiceFix.file}`);
  console.error(`  Error: ${error.message}\n`);
  errors.push({ update: ocrServiceFix.description, error: error.message });
  errorCount++;
}

// Summary
console.log('═'.repeat(70));
console.log(`Updates complete: ${successCount} succeeded, ${errorCount} failed`);
console.log('═'.repeat(70));
console.log('');

if (errors.length > 0) {
  console.log('❌ ERRORS ENCOUNTERED:\n');
  errors.forEach((err, idx) => {
    console.log(`${idx + 1}. ${err.update}`);
    console.log(`   ${err.error}\n`);
  });
}

if (errorCount === 0) {
  console.log('✅ All files updated successfully!\n');
  console.log('Next steps:\n');
  console.log('1. Run database migrations:');
  console.log('   npm run migrate\n');
  console.log('2. Check migration status:');
  console.log('   node scripts/migration-status.js\n');
  console.log('3. Restart the development server:');
  console.log('   npm run start:dev\n');
  console.log('The TypeScript compilation should now complete without errors.');
  console.log('');
  process.exit(0);
} else {
  console.log('⚠️  Some updates failed. Please check the errors above.');
  console.log('You may need to manually copy files or check file permissions.\n');
  process.exit(1);
}
