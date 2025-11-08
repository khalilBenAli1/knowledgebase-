const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'frontend/src/pages/ActualitiesPage.tsx');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Add useNavigate import
  if (!content.includes('useNavigate')) {
    content = content.replace(
      "import { useState, useEffect } from 'react';",
      "import { useState, useEffect } from 'react';\nimport { useNavigate } from 'react-router-dom';"
    );
  }

  // Add navigate hook
  if (!content.includes('const navigate = useNavigate()')) {
    content = content.replace(
      'export default function ActualitiesPage() {',
      'export default function ActualitiesPage() {\n  const navigate = useNavigate();'
    );
  }

  // Make cards clickable - find the card div and add onClick
  content = content.replace(
    /(<div\s+key={actuality\.id}\s+className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col")/,
    '<div\n                  key={actuality.id}\n                  onClick={() => navigate(`/actualites/${actuality.id}`)}\n                  className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-all cursor-pointer flex flex-col transform hover:scale-105"'
  );

  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ ActualitiesPage.tsx updated - cards are now clickable!');
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}
