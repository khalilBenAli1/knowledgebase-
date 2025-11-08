const fs = require('fs');
const path = require('path');

const layoutPath = path.join(__dirname, 'frontend/src/components/Layout.tsx');

try {
  let content = fs.readFileSync(layoutPath, 'utf8');

  // Add canAccessManager and canAccessHRCatalog permissions
  if (!content.includes('canAccessManager')) {
    content = content.replace(
      'const canAccessAccueil =',
      `const canAccessManager = user?.role?.name === 'Manager';
  const canAccessHRCatalog = ['Gestionnaire RH', 'Responsable RH'].includes(user?.role?.name || '');
  const canAccessAccueil =`
    );
  }

  // Add Manager Dashboard link in desktop nav (before Formations)
  if (!content.includes('/manager')) {
    const managerLink = `            {canAccessManager && (
              <Link to="/manager" className={\`px-4 py-2 rounded-lg transition-all \${isActive('/manager') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}\`}>
                Mes Équipes
              </Link>
            )}
            `;

    content = content.replace(
      '<Link to="/formations"',
      managerLink + '<Link to="/formations"'
    );
  }

  // Add HR Catalog link in desktop nav (after Formations, before Documents)
  if (!content.includes('/hr/catalog')) {
    const hrCatalogLink = `            {canAccessHRCatalog && (
              <Link to="/hr/catalog" className={\`px-4 py-2 rounded-lg transition-all \${isActive('/hr/catalog') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}\`}>
                Catalogue RH
              </Link>
            )}
            `;

    // Find position after formations link
    const formationsPattern = /<Link to="\/formations" className=.*?<\/Link>\s*\n\s*<\/Link>\s*\n\s*}\s*\n\s*}\s*\)/;
    content = content.replace(
      formationsPattern,
      (match) => match + '\n            ' + hrCatalogLink.trim()
    );
  }

  // Add mobile links similarly
  if (!content.includes('Mes Équipes')) {
    // Add mobile manager link
    const mobileManagerLink = `              {canAccessManager && (
                <Link to="/manager" onClick={handleNavClick} className={\`block px-4 py-2 rounded-lg transition-all \${isActive('/manager') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}\`}>
                  Mes Équipes
                </Link>
              )}
              `;

    content = content.replace(
      '<Link to="/formations" onClick={handleNavClick}',
      mobileManagerLink + '<Link to="/formations" onClick={handleNavClick}'
    );
  }

  if (!content.includes('Catalogue RH')) {
    // Add mobile HR catalog link
    const mobileHRCatalogLink = `              {canAccessHRCatalog && (
                <Link to="/hr/catalog" onClick={handleNavClick} className={\`block px-4 py-2 rounded-lg transition-all \${isActive('/hr/catalog') ? 'bg-white/20 text-white font-semibold' : 'hover:bg-white/10 text-white/90'}\`}>
                  Catalogue RH
                </Link>
              )}
              `;

    // Add after mobile formations
    content = content.replace(
      /(<Link to="\/formations" onClick={handleNavClick}.*?<\/Link>\s*\n\s*<\/Link>\s*\n\s*}\s*\n\s*}\s*\))/s,
      (match) => match + '\n              ' + mobileHRCatalogLink.trim()
    );
  }

  fs.writeFileSync(layoutPath, content, 'utf8');
  console.log('✓ Layout.tsx updated with navigation links!');
  console.log('  - Manager Dashboard (Mes Équipes) for Managers');
  console.log('  - HR Catalog Upload (Catalogue RH) for HR admins');
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
}
