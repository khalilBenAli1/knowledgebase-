const fs = require('fs');
const path = require('path');

console.log('Fixing column name mapping in Formation entity...\n');

const entityPath = path.join(__dirname, 'src/entities/formation.entity.ts');

try {
  let content = fs.readFileSync(entityPath, 'utf8');

  // Fix maxParticipants column name
  const before = "@Column({ type: 'int', nullable: true })\n  maxParticipants: number;";
  const after = "@Column({ type: 'int', nullable: true, name: 'max_participants' })\n  maxParticipants: number;";

  if (content.includes(before)) {
    content = content.replace(before, after);
    fs.writeFileSync(entityPath, content, 'utf8');
    console.log('✓ Fixed maxParticipants column mapping');
    console.log('  Database column: max_participants');
    console.log('  Entity property: maxParticipants\n');
    console.log('Next step: Restart your dev server');
    console.log('  npm run start:dev\n');
  } else if (content.includes("name: 'max_participants'")) {
    console.log('⊘ Column mapping already fixed\n');
    console.log('If you still see errors, restart your dev server:');
    console.log('  npm run start:dev\n');
  } else {
    console.log('⚠ Could not find the column definition to fix');
    console.log('Please manually add name parameter:\n');
    console.log('  @Column({ type: \'int\', nullable: true, name: \'max_participants\' })');
    console.log('  maxParticipants: number;\n');
  }

  process.exit(0);

} catch (error) {
  console.error('✗ Error:', error.message);
  console.error('\nPlease stop the dev server first (Ctrl+C) then run this script again.\n');
  process.exit(1);
}
