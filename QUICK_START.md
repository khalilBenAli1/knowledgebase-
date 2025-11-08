# 🚀 Quick Start Guide

This guide will help you quickly implement all the new features.

## ⚡ Quick Setup (5 minutes)

### Step 1: Install Dependencies

```bash
# Backend
npm install nodemailer @types/nodemailer form-data @types/form-data

# Frontend (if needed)
cd frontend
npm install
cd ..
```

### Step 2: Update Environment Variables

Add to your `.env` file:

```bash
# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password

# App URL
APP_URL=http://localhost:3000

# OCR API Key (get free at https://ocr.space/ocrapi)
OCR_API_KEY=your-ocr-space-key
```

### Step 3: Run Database Migration

```bash
# Connect to PostgreSQL
psql -U your_username -d your_database_name

# Run the migration
\i migrations/001_add_manager_and_formation_requests.sql

# Verify
SELECT * FROM roles WHERE name = 'Manager';
SELECT tablename FROM pg_tables WHERE tablename = 'formation_requests';
```

### Step 4: Update Entity Files

```bash
# Backup originals
cp src/entities/role.entity.ts src/entities/role.entity.backup.ts
cp src/entities/user.entity.ts src/entities/user.entity.backup.ts

# Replace with updated versions
cp src/entities/role.entity.updated.ts src/entities/role.entity.ts
cp src/entities/user.entity.updated.ts src/entities/user.entity.ts
```

### Step 5: Update App Module

Add to `src/app.module.ts`:

```typescript
import { FormationRequestsModule } from './modules/formation-requests/formation-requests.module';
import { EmailModule } from './modules/email/email.module';

@Module({
  imports: [
    // ... existing modules
    FormationRequestsModule,
    EmailModule,
  ],
})
```

### Step 6: Update Frontend Login Page

```bash
# Backup original
cp frontend/src/pages/LoginPage.tsx frontend/src/pages/LoginPage.backup.tsx

# Replace with updated version
cp frontend/src/pages/LoginPage.updated.tsx frontend/src/pages/LoginPage.tsx
```

### Step 7: Start the Application

```bash
# Terminal 1: Backend
npm run start:dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

---

## 📋 Verification Checklist

After setup, verify these work:

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Login page displays without Microsoft button
- [ ] Can query: `http://localhost:3000/api/formation-requests` (should return 401 if not logged in, or empty array if logged in)

---

## 🎯 Key Features Ready to Use

### 1. Formation Request System

**API Endpoints Available:**
```
POST   /api/formation-requests              - Submit request
GET    /api/formation-requests/my-requests  - View my requests
GET    /api/formation-requests/pending-reviews - View pending (managers)
PUT    /api/formation-requests/:id/review   - Approve/decline (managers)
DELETE /api/formation-requests/:id          - Cancel request
```

**Example: Submit Request**
```typescript
const response = await api.post('/formation-requests', {
  formationId: 'uuid-of-formation',
  requesterMessage: 'I need this for my project'
});
```

### 2. Email Service

The email service is ready to use for:
- Email verification on signup
- Formation request notifications
- Password reset

### 3. Improved OCR

New endpoint for formation catalog import:
```typescript
// Upload PDF catalog
const formData = new FormData();
formData.append('file', pdfFile);
await api.post('/documents', formData);

// Extract formations from document
const formations = await api.post(`/ocr/extract-formations/${documentId}`);
```

---

## 🔧 Minimal Frontend Implementation

If you want to test quickly without full UI, use these API calls:

### Test Formation Request Workflow

```typescript
// 1. Get available formations
const formations = await api.get('/formations');

// 2. Submit request
const request = await api.post('/formation-requests', {
  formationId: formations.data[0].id,
  requesterMessage: 'Need this training'
});

// 3. As manager, approve it
await api.put(`/formation-requests/${request.data.id}/review`, {
  status: 'approved',
  managerResponse: 'Approved for Q1 2025'
});

// 4. Check status
const myRequests = await api.get('/formation-requests/my-requests');
```

---

## 🐛 Common Issues & Fixes

### Issue: Migration fails with "type already exists"

**Solution:** The enum types might already exist. Run:
```sql
DROP TYPE IF EXISTS "FormationRequestStatus" CASCADE;
```
Then re-run the migration.

### Issue: Email not sending

**Solution:** For Gmail:
1. Enable 2FA on your Google account
2. Go to Security > App Passwords
3. Generate new app password
4. Use that in `EMAIL_PASSWORD`

### Issue: OCR returns empty text

**Solution:**
1. Check OCR_API_KEY is valid
2. Verify you have API credits remaining
3. Check file format is supported (PDF, JPG, PNG)

---

## 📊 Database Setup for Testing

Create test users with manager relationships:

```sql
-- Create a manager
INSERT INTO users (id, name, email, "passwordHash", "roleId", "isActive")
VALUES (
  gen_random_uuid(),
  'Test Manager',
  'manager@test.com',
  '$2b$10$...',  -- Use bcrypt hash
  (SELECT id FROM roles WHERE name = 'Manager'),
  true
);

-- Create an employee under this manager
INSERT INTO users (id, name, email, "passwordHash", "roleId", "managerId", "isActive")
VALUES (
  gen_random_uuid(),
  'Test Employee',
  'employee@test.com',
  '$2b$10$...',  -- Use bcrypt hash
  (SELECT id FROM roles WHERE name = 'Collaborateur'),
  (SELECT id FROM users WHERE email = 'manager@test.com'),
  true
);
```

---

## 📈 Next Steps

1. ✅ Basic setup complete
2. 🎨 Create frontend pages (see IMPLEMENTATION_GUIDE.md for detailed UI components)
3. 🧪 Test all workflows
4. 🚀 Deploy to staging

---

## 💡 Pro Tips

- Use Postman/Insomnia to test API endpoints first
- Check backend logs for detailed error messages
- Use `npm run start:dev` for hot reload during development
- Test email templates by sending to your own email first

---

**Need more details?** Check the full [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)
