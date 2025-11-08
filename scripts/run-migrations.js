const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load .env file
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Color codes for terminal output
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
  // Parse postgres://user:password@host:port/database
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

async function runMigrations() {
  // Get database connection details from environment
  let dbConfig;

  // Try DATABASE_URL first (Docker/Heroku style)
  if (process.env.DATABASE_URL) {
    dbConfig = parseDatabaseUrl(process.env.DATABASE_URL);
    if (!dbConfig) {
      log('⚠ Invalid DATABASE_URL format', 'yellow');
      log('Expected: postgres://user:password@host:port/database', 'yellow');
    }
  }

  // Fall back to individual variables with Docker-friendly defaults
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
  log('║     ASSURANCES BIAT - MIGRATIONS RUNNER     ║', 'cyan');
  log('╚══════════════════════════════════════════════╝\n', 'cyan');

  log(`Connecting to database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`, 'blue');

  const client = new Client(dbConfig);

  try {
    await client.connect();
    log('✓ Connected to database\n', 'green');

    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      log('⚠ No migration files found in migrations/', 'yellow');
      return;
    }

    log(`Found ${files.length} migration file(s):\n`, 'blue');

    // Check which migrations have already been run
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations ORDER BY id'
    );
    const executedNames = executedMigrations.map(m => m.name);

    for (const file of files) {
      const migrationName = file;

      if (executedNames.includes(migrationName)) {
        log(`⊘ ${migrationName} - Already executed, skipping`, 'yellow');
        continue;
      }

      log(`▶ Running: ${migrationName}`, 'blue');

      try {
        // Read migration file
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        // Execute migration in a transaction
        await client.query('BEGIN');

        // Parse SQL statements properly (handles DO blocks, multi-line, etc.)
        const statements = parseSqlStatements(sql);

        for (const statement of statements) {
          if (statement.trim().length > 0) {
            await client.query(statement);
          }
        }

        // Record migration as executed
        await client.query(
          'INSERT INTO migrations (name) VALUES ($1)',
          [migrationName]
        );

        await client.query('COMMIT');

        log(`  ✓ ${migrationName} - Success\n`, 'green');

      } catch (error) {
        await client.query('ROLLBACK');
        log(`  ✗ ${migrationName} - Failed`, 'red');
        log(`  Error: ${error.message}\n`, 'red');

        // Continue with next migration or stop?
        if (process.env.MIGRATION_CONTINUE_ON_ERROR !== 'true') {
          throw error;
        }
      }
    }

    // Show summary
    log('\n╔══════════════════════════════════════════════╗', 'cyan');
    log('║            MIGRATION SUMMARY                 ║', 'cyan');
    log('╚══════════════════════════════════════════════╝\n', 'cyan');

    const { rows: allMigrations } = await client.query(
      'SELECT name, executed_at FROM migrations ORDER BY id'
    );

    allMigrations.forEach((m, idx) => {
      const date = new Date(m.executed_at).toLocaleString('fr-FR');
      log(`${idx + 1}. ${m.name} - ${date}`, 'green');
    });

    log(`\n✓ Total migrations executed: ${allMigrations.length}`, 'green');

  } catch (error) {
    log('\n✗ Migration failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('\nStack trace:', 'red');
    console.error(error);
    process.exit(1);

  } finally {
    await client.end();
    log('\n✓ Database connection closed', 'blue');
  }
}

/**
 * Parse SQL file into individual statements
 * Handles DO $$ blocks, dollar-quoted strings, and multi-line statements
 */
function parseSqlStatements(sql) {
  // Remove single-line comments
  sql = sql.replace(/--.*$/gm, '');

  // Remove multi-line comments
  sql = sql.replace(/\/\*[\s\S]*?\*\//gm, '');

  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';

  let i = 0;
  while (i < sql.length) {
    const char = sql[i];

    // Check for dollar quote start/end
    if (char === '$') {
      // Try to find the dollar quote tag
      let tag = '$';
      let j = i + 1;

      // Read tag name if exists (e.g., $tag$)
      while (j < sql.length && sql[j] !== '$') {
        tag += sql[j];
        j++;
      }

      if (j < sql.length && sql[j] === '$') {
        tag += '$';

        if (inDollarQuote) {
          // Check if this closes the current dollar quote
          if (tag === dollarTag) {
            current += tag;
            i = j + 1;
            inDollarQuote = false;
            dollarTag = '';
            continue;
          }
        } else {
          // Start new dollar quote
          current += tag;
          i = j + 1;
          inDollarQuote = true;
          dollarTag = tag;
          continue;
        }
      }
    }

    // If we hit a semicolon outside dollar quotes, that's a statement boundary
    if (char === ';' && !inDollarQuote) {
      current += char;
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    // Add character to current statement
    current += char;
    i++;
  }

  // Add any remaining statement
  const trimmed = current.trim();
  if (trimmed.length > 0 && trimmed !== ';') {
    statements.push(trimmed);
  }

  return statements;
}

// Run migrations
runMigrations()
  .then(() => {
    log('\n✓ All migrations completed successfully!\n', 'green');
    process.exit(0);
  })
  .catch((error) => {
    log('\n✗ Migration process failed!\n', 'red');
    console.error(error);
    process.exit(1);
  });
