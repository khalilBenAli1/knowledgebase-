const fs = require('fs');
const path = require('path');

console.log('\n🚀 Applying Backend Updates...\n');

const files = [
  {
    from: 'src/app.module.updated.ts',
    to: 'src/app.module.ts',
  },
  {
    from: 'src/modules/formation-requests/formation-requests.service.updated.ts',
    to: 'src/modules/formation-requests/formation-requests.service.ts',
  },
  {
    from: 'src/modules/formation-requests/formation-requests.module.updated.ts',
    to: 'src/modules/formation-requests/formation-requests.module.ts',
  },
  {
    from: 'src/modules/formations/formations.controller.updated.ts',
    to: 'src/modules/formations/formations.controller.ts',
  },
  {
    from: 'src/modules/formations/formations.module.updated.ts',
    to: 'src/modules/formations/formations.module.ts',
  },
];

let success = 0;
let failed = 0;

files.forEach((file, index) => {
  try {
    const fromPath = path.join(__dirname, file.from);
    const toPath = path.join(__dirname, file.to);

    if (!fs.existsSync(fromPath)) {
      console.log(`❌ [${index + 1}/${files.length}] Source not found: ${file.from}`);
      failed++;
      return;
    }

    const content = fs.readFileSync(fromPath, 'utf8');
    fs.writeFileSync(toPath, content, 'utf8');

    console.log(`✅ [${index + 1}/${files.length}] Updated: ${file.to}`);
    success++;
  } catch (error) {
    console.log(`❌ [${index + 1}/${files.length}] Failed: ${file.to}`);
    console.log(`   Error: ${error.message}`);
    failed++;
  }
});

console.log(`\n📊 Summary:`);
console.log(`   ✅ Success: ${success}`);
console.log(`   ❌ Failed: ${failed}`);

if (success === files.length) {
  console.log(`\n🎉 All updates applied successfully!`);
  console.log(`\n📋 Next steps:`);
  console.log(`   1. Run migration: npm run migrate`);
  console.log(`   2. Restart backend: npm run start:dev`);
  console.log(`   3. Check IMPLEMENTATION_COMPLETE.md for full details`);
} else {
  console.log(`\n⚠️  Some updates failed. Please check the errors above.`);
  process.exit(1);
}
