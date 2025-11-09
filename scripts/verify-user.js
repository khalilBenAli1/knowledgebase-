const { Client } = require('pg');
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

async function verifyUser() {
  // Get email from command line argument
  const email = process.argv[2];

  if (!email) {
    log('\n✗ Error: Please provide an email address', 'red');
    log('Usage: node scripts/verify-user.js <email>', 'yellow');
    log('Example: node scripts/verify-user.js user@biat.com.tn\n', 'yellow');
    process.exit(1);
  }

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
  log('║     ASSURANCES BIAT - USER VERIFIER         ║', 'cyan');
  log('╚══════════════════════════════════════════════╝\n', 'cyan');

  log(`Connecting to database: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`, 'blue');

  const client = new Client(dbConfig);

  try {
    await client.connect();
    log('✓ Connected to database\n', 'green');

    // Check if user exists
    const { rows: users } = await client.query(
      'SELECT id, email, name, "isEmailVerified" FROM users WHERE email = $1',
      [email]
    );

    if (users.length === 0) {
      log(`✗ User not found with email: ${email}`, 'red');
      log('\nPlease check the email address and try again.\n', 'yellow');
      process.exit(1);
    }

    const user = users[0];

    log(`Found user:`, 'blue');
    log(`  Name: ${user.name}`, 'blue');
    log(`  Email: ${user.email}`, 'blue');
    log(`  Currently verified: ${user.isEmailVerified ? 'Yes' : 'No'}`, 'blue');
    log('', 'reset');

    if (user.isEmailVerified) {
      log(`✓ User is already verified!`, 'green');
      log('\nNo action needed. User can login normally.\n', 'yellow');
      process.exit(0);
    }

    // Update user to verified
    await client.query(
      `UPDATE users
       SET "isEmailVerified" = true,
           "emailVerificationToken" = NULL,
           "emailVerificationTokenExpires" = NULL
       WHERE id = $1`,
      [user.id]
    );

    log(`✓ Successfully verified user: ${user.email}`, 'green');
    log('\nThe user can now login to the application.\n', 'green');

  } catch (error) {
    log('\n✗ Verification failed!', 'red');
    log(`Error: ${error.message}`, 'red');
    log('\nStack trace:', 'red');
    console.error(error);
    process.exit(1);

  } finally {
    await client.end();
    log('✓ Database connection closed\n', 'blue');
  }
}

// Run verification
verifyUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    log('\n✗ Verification process failed!\n', 'red');
    console.error(error);
    process.exit(1);
  });
