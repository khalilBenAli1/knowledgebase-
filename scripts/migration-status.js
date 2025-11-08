const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseDatabaseUrl(url) {
  const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
  const match = url.match(regex);
  if (match) {
    return {
      user: match[1],
      password: match[2],
      host: match[3],
      port: parseInt(match[4]),
      database: match[5],
    };
  }
  return null;
}

async function checkMigrationStatus() {
  let dbConfig;

  if (process.env.DATABASE_URL) {
    dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
  }

  if (!dbConfig) {
    dbConfig = {
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5433'),
      database: process.env.DATABASE_NAME || 'assurances_biat',
      user: process.env.DATABASE_USER || 'user',
      password: process.env.DATABASE_PASSWORD || 'password',
    };
  }

  log('\n╔══════════════════════════════════════════════╗', 'cyan');
  log('║        MIGRATION STATUS CHECK                ║', 'cyan');
  log('╚══════════════════════════════════════════════╝\n', 'cyan');

  const client = new Client(dbConfig);

  try {
    await client.connect();

    // Check if migrations table exists
    const { rows } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'migrations'
      );
    `);

    if (!rows[0].exists) {
      log('⚠ Migrations table does not exist', 'yellow');
      log('Run: npm run migrate\n', 'blue');
      return;
    }

    // Get executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name, executed_at FROM migrations ORDER BY id'
    );

    // Get all migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const executedNames = executedMigrations.map(m => m.name);
    const pending = files.filter(f => !executedNames.includes(f));

    // Display executed migrations
    log('✓ Executed Migrations:', 'green');
    log('═════════════════════════════════════════════\n', 'green');

    if (executedMigrations.length === 0) {
      log('  None', 'yellow');
    } else {
      executedMigrations.forEach((m, idx) => {
        const date = new Date(m.executed_at).toLocaleString('fr-FR');
        log(`  ${idx + 1}. ${m.name}`, 'green');
        log(`     Executed: ${date}`, 'blue');
      });
    }

    // Display pending migrations
    log('\n⧗ Pending Migrations:', 'yellow');
    log('═════════════════════════════════════════════\n', 'yellow');

    if (pending.length === 0) {
      log('  None - All migrations up to date!', 'green');
    } else {
      pending.forEach((file, idx) => {
        log(`  ${idx + 1}. ${file}`, 'yellow');
      });
      log(`\nRun: npm run migrate\n`, 'blue');
    }

    // Summary
    log('\n╔══════════════════════════════════════════════╗', 'cyan');
    log('║                SUMMARY                       ║', 'cyan');
    log('╚══════════════════════════════════════════════╝\n', 'cyan');

    log(`Total migration files: ${files.length}`, 'blue');
    log(`Executed: ${executedMigrations.length}`, 'green');
    log(`Pending: ${pending.length}`, pending.length > 0 ? 'yellow' : 'green');
    log('');

  } catch (error) {
    log('\n✗ Error checking migration status', 'red');
    log(`Error: ${error.message}\n`, 'red');
    process.exit(1);
  } finally {
    await client.end();
  }
}

checkMigrationStatus()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
