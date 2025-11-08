# 🚀 Complete Migration & Setup Guide

## 📋 Overview

This guide shows you how to run all database migrations with a simple command.

---

## ⚡ Quick Start (One Command!)

### Step 1: Add Database Config to .env

```bash
# Add to your .env file
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=assurances_biat
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password-here
```

### Step 2: Add Migration Script to package.json

Open `package.json` and add these lines to the `"scripts"` section:

```json
{
  "scripts": {
    "migrate": "node scripts/run-migrations.js",
    "migrate:status": "node scripts/migration-status.js"
  }
}
```

### Step 3: Run Migrations

```bash
npm run migrate
```

That's it! 🎉

---

## 📺 What Happens When You Run Migrations

### Visual Output

```
╔══════════════════════════════════════════════╗
║     ASSURANCES BIAT - MIGRATIONS RUNNER     ║
╚══════════════════════════════════════════════╝

Connecting to database: assurances_biat@localhost:5432
✓ Connected to database

Found 2 migration file(s):

▶ Running: 001_add_manager_and_formation_requests.sql
  ✓ 001_add_manager_and_formation_requests.sql - Success

▶ Running: 002_merge_hr_roles_and_improvements.sql
  ✓ 002_merge_hr_roles_and_improvements.sql - Success

╔══════════════════════════════════════════════╗
║            MIGRATION SUMMARY                 ║
╚══════════════════════════════════════════════╝

1. 001_add_manager_and_formation_requests.sql - 08/01/2025 14:30:15
2. 002_merge_hr_roles_and_improvements.sql - 08/01/2025 14:30:18

✓ Total migrations executed: 2

✓ Database connection closed

✓ All migrations completed successfully!
```

---

## 🔍 Check Migration Status

To see which migrations have been run:

```bash
npm run migrate:status
```

**Output**:
```
╔══════════════════════════════════════════════╗
║        MIGRATION STATUS CHECK                ║
╚══════════════════════════════════════════════╝

✓ Executed Migrations:
═════════════════════════════════════════════

  1. 001_add_manager_and_formation_requests.sql
     Executed: 08/01/2025 14:30:15

  2. 002_merge_hr_roles_and_improvements.sql
     Executed: 08/01/2025 14:30:18

⧗ Pending Migrations:
═════════════════════════════════════════════

  None - All migrations up to date!

╔══════════════════════════════════════════════╗
║                SUMMARY                       ║
╚══════════════════════════════════════════════╝

Total migration files: 2
Executed: 2
Pending: 0
```

---

## 📁 Migration Files

All migrations are in the `migrations/` folder:

```
migrations/
├── 001_add_manager_and_formation_requests.sql
└── 002_merge_hr_roles_and_improvements.sql
```

### What Each Migration Does

#### **001_add_manager_and_formation_requests.sql**

Creates:
- ✅ Manager role
- ✅ User hierarchy (managerId field)
- ✅ Email verification fields
- ✅ formation_requests table
- ✅ All necessary indexes

Updates:
- ✅ users table with new columns
- ✅ roles table with Manager role

#### **002_merge_hr_roles_and_improvements.sql**

Updates:
- ✅ Merges "Gestionnaire RH" → "Responsable RH"
- ✅ Updates all affected users
- ✅ Removes old "Gestionnaire RH" role
- ✅ Updates permissions for merged role

---

## 🔧 How the Migration System Works

### 1. Tracking Table

When you first run `npm run migrate`, it creates a `migrations` table:

```sql
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Execution Logic

```
For each .sql file in migrations/:
  ↓
Check if already in migrations table
  ↓
No? → Execute SQL
  ↓
Record in migrations table
  ↓
Yes? → Skip (already executed)
```

### 3. Safety Features

- ✅ **Transactions** - Each migration runs in a transaction (all or nothing)
- ✅ **Rollback on error** - If migration fails, no changes applied
- ✅ **Skip executed** - Never runs same migration twice
- ✅ **Ordered execution** - Files run in alphabetical order

---

## 🎯 Complete Setup Checklist

### Prerequisites
- [ ] PostgreSQL installed and running
- [ ] Database created
- [ ] Node.js installed

### Setup Steps

#### 1. Database Configuration (2 min)
```bash
# Add to .env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=assurances_biat
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
```

#### 2. Email Configuration (5 min)
```bash
# Add to .env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
APP_URL=http://localhost:3000
```

See [EMAIL_SYSTEM_GUIDE.md](./EMAIL_SYSTEM_GUIDE.md) for detailed email setup.

#### 3. Add NPM Scripts (1 min)
Add to package.json:
```json
"migrate": "node scripts/run-migrations.js",
"migrate:status": "node scripts/migration-status.js"
```

#### 4. Install Dependencies (2 min)
```bash
npm install pg nodemailer @types/nodemailer sharp canvas
```

#### 5. Run Migrations (1 min)
```bash
npm run migrate
```

#### 6. Verify (1 min)
```bash
npm run migrate:status
```

#### 7. Replace Files (5 min)
```bash
# OCR Service
cp src/modules/ocr/ocr-enhanced.service.ts src/modules/ocr/ocr.service.ts

# Role Entity
cp src/entities/role.entity.final.ts src/entities/role.entity.ts

# Chat Service
cp src/modules/chat/chat.service.updated.ts src/modules/chat/chat.service.ts

# LLM Providers
cp src/modules/llm/providers/ollama.provider.updated.ts src/modules/llm/providers/ollama.provider.ts
cp src/modules/llm/providers/groq.provider.updated.ts src/modules/llm/providers/groq.provider.ts
```

#### 8. Update Modules (2 min)

Add to `src/modules/chat/chat.module.ts`:
```typescript
import { Formation } from '../../entities/formation.entity';

TypeOrmModule.forFeature([ChatSession, ChatMessage, Formation])
```

Add to `src/app.module.ts`:
```typescript
import { FormationRequestsModule } from './modules/formation-requests/formation-requests.module';
import { EmailModule } from './modules/email/email.module';

imports: [
  // ... existing
  FormationRequestsModule,
  EmailModule,
]
```

#### 9. Build & Test (2 min)
```bash
npm run build
npm run start:dev
```

**Total time: ~20 minutes**

---

## 🧪 Testing After Migration

### Test 1: Verify Database Changes

```bash
# Connect to database
psql -U postgres -d assurances_biat

# Check roles (should be 4)
SELECT name FROM roles ORDER BY name;

# Expected output:
#   Collaborateur
#   IT Admin
#   Manager
#   Responsable RH

# Check formation_requests table exists
\dt formation_requests

# Check user table has new columns
\d users
# Should see: managerId, isEmailVerified, etc.
```

### Test 2: Test Backend

```bash
# Start backend
npm run start:dev

# Should start without errors
# Check for these in logs:
# ✓ Database connected
# ✓ All modules loaded
# ✓ Server listening on port 3000
```

### Test 3: Test Formation Requests API

```bash
# Check endpoint exists
curl http://localhost:3000/api/formation-requests

# Should return 401 (needs auth) or empty array
```

---

## 🐛 Troubleshooting

### Error: "Cannot connect to database"

**Check**:
1. PostgreSQL is running
2. Database name, user, password are correct in .env
3. Port 5432 is accessible

```bash
# Test connection
psql -U postgres -h localhost -p 5432 -d assurances_biat
```

### Error: "Migration already exists"

**Solution**: Migration was already run. This is normal!

```bash
# Check status
npm run migrate:status
```

### Error: "SQL syntax error"

**Solution**: Check migration file for syntax errors

```bash
# Test SQL manually
psql -U postgres -d assurances_biat -f migrations/001_add_manager_and_formation_requests.sql
```

### Error: "Module not found"

**Solution**: Install missing dependency

```bash
npm install pg
```

---

## 🔄 Rolling Back Migrations

Each migration file includes a rollback script in comments at the bottom.

To rollback manually:

```bash
# Connect to database
psql -U postgres -d assurances_biat

# Copy rollback SQL from migration file and paste here
# Example from 001_add_manager_and_formation_requests.sql:

DROP TABLE IF EXISTS formation_requests CASCADE;
DROP TYPE IF EXISTS "FormationRequestStatus";
ALTER TABLE users DROP COLUMN IF EXISTS "managerId";
-- ... etc
```

---

## 📊 Migration History Tracking

View all executed migrations:

```sql
SELECT * FROM migrations ORDER BY id;
```

Output:
```
 id |                   name                    |      executed_at
----+-------------------------------------------+------------------------
  1 | 001_add_manager_and_formation_requests.sql | 2025-01-08 14:30:15
  2 | 002_merge_hr_roles_and_improvements.sql    | 2025-01-08 14:30:18
```

---

## 🎓 Creating New Migrations

To add new migrations:

1. Create new file: `migrations/003_your_migration_name.sql`
2. Write SQL commands
3. Add rollback script in comments
4. Run: `npm run migrate`

**Example**:
```sql
-- migrations/003_add_user_preferences.sql

-- Add user preferences column
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';

-- Create index
CREATE INDEX idx_users_preferences ON users USING GIN (preferences);

-- ============================================
-- ROLLBACK SCRIPT
-- ============================================
/*
ALTER TABLE users DROP COLUMN IF EXISTS preferences;
*/
```

---

## 📈 Best Practices

### 1. Always Backup Database First

```bash
# Before running migrations
pg_dump -U postgres assurances_biat > backup_$(date +%Y%m%d).sql
```

### 2. Test Migrations Locally

Never run migrations directly on production. Test on local/staging first.

### 3. Use Transactions

All migrations run in transactions automatically. Each migration is all-or-nothing.

### 4. Keep Migrations Small

One migration = one logical change

✅ Good:
- 001_add_manager_role.sql
- 002_add_email_verification.sql

❌ Bad:
- 001_massive_changes_everything.sql

### 5. Never Modify Executed Migrations

Once a migration is run on any environment, never change it. Create a new migration instead.

---

## 🎯 Summary

### What You Can Do Now

```bash
# Run all pending migrations
npm run migrate

# Check migration status
npm run migrate:status
```

### What Got Created

1. ✅ Manager role
2. ✅ User hierarchy (manager-subordinate)
3. ✅ Email verification system
4. ✅ Formation request workflow
5. ✅ Merged HR roles
6. ✅ All necessary database indexes

### What's Next

1. Start backend: `npm run start:dev`
2. Test features
3. Deploy to production

---

**Migration System**: ✅ Ready to Use
**Total Setup Time**: ~20 minutes
**Status**: Production Ready 🚀
