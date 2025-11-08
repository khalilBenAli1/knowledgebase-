# 🚀 PROJECT SETUP GUIDE - Assurances BIAT AI Assistant

## 📋 Prerequisites

Make sure you have installed:
- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **PostgreSQL** (via Docker) - [Download Docker Desktop](https://www.docker.com/products/docker-desktop/)
- **Git** - [Download](https://git-scm.com/)

---

## 🔧 Step 1: Clone the Project

```bash
git clone <repository-url>
cd assurances-biat-ai-assistant
```

---

## 📦 Step 2: Install Dependencies

### Backend Dependencies
```bash
npm install
```

### Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## 🐳 Step 3: Start PostgreSQL Database (Docker)

### Option A: Using Docker Compose (Recommended)
```bash
docker-compose up -d postgres
```

### Option B: Manual Docker Command
```bash
docker run -d \
  --name postgres-biat \
  -e POSTGRES_USER=user \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=assurances_biat \
  -p 5433:5432 \
  postgres:15-alpine
```

### Verify Database is Running
```bash
docker ps
```
You should see a container named `postgres-biat` or similar.

---

## ⚙️ Step 4: Configure Environment Variables

Create a `.env` file in the root directory (if it doesn't exist):

```bash
# Copy from .env.example if it exists
cp .env.example .env
```

**Required Environment Variables:**

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5433/assurances_biat
DATABASE_HOST=localhost
DATABASE_PORT=5433
DATABASE_NAME=assurances_biat
DATABASE_USER=user
DATABASE_PASSWORD=password

# JWT Secret (change this to a random string in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Server Configuration
PORT=3000
NODE_ENV=development

# OpenAI API Key (for AI features - optional for testing)
OPENAI_API_KEY=your-openai-api-key-here
```

---

## 🗄️ Step 5: Run Database Migrations

This will create all the necessary database tables and relationships:

```bash
npm run migrate
```

**Expected Output:**
```
╔══════════════════════════════════════════════╗
║     ASSURANCES BIAT - MIGRATIONS RUNNER     ║
╚══════════════════════════════════════════════╝

Connecting to database: assurances_biat@localhost:5433
✓ Connected to database

Found 4 migration file(s):

▶ Running: 001_add_manager_and_formation_requests.sql
  ✓ 001_add_manager_and_formation_requests.sql - Success

▶ Running: 002_merge_hr_roles_and_improvements.sql
  ✓ 002_merge_hr_roles_and_improvements.sql - Success

▶ Running: 003_add_notifications_and_interactions.sql
  ✓ 003_add_notifications_and_interactions.sql - Success

▶ Running: 004_update_formations_table.sql
  ✓ 004_update_formations_table.sql - Success

✓ Total migrations executed: 4
✓ All migrations completed successfully!
```

---

## 🌱 Step 6: Seed Initial Data (Optional)

Create initial users and roles:

```bash
npm run seed
```

This will create:
- Default admin user
- Sample roles (HR Admin, Manager, Employee, IT Admin)
- Test users

---

## 🏗️ Step 7: Build the Project

```bash
npm run build
```

This builds both backend and frontend:
- Backend: Compiles TypeScript to JavaScript in `dist/`
- Frontend: Bundles React app in `frontend/dist/`

---

## 🚀 Step 8: Start the Application

### Development Mode (with hot reload)

**Terminal 1 - Backend:**
```bash
npm run start:dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000

### Production Mode

```bash
# Start backend in production mode
npm run start:prod

# Frontend is served by backend from /dist folder
```

Then visit: http://localhost:3000

---

## ✅ Step 9: Verify Everything Works

### 1. Check Backend is Running
Visit: http://localhost:3000/api/health

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T..."
}
```

### 2. Check Frontend is Running
Visit: http://localhost:5173 (dev) or http://localhost:3000 (prod)

You should see the login page.

### 3. Test Login
Default credentials (if you ran seed):
- **Email**: admin@biat.com.tn
- **Password**: admin123

---

## 🎯 Features to Test

After logging in, test these features:

### ✅ Notifications
- [ ] Click notification bell in header
- [ ] See unread count
- [ ] Click notification to navigate
- [ ] Click "Voir toutes les notifications"

### ✅ Formations
- [ ] View formations list
- [ ] **Click on a formation card** to see details
- [ ] Request a formation (if not admin)
- [ ] Create/edit formations (if HR admin)

### ✅ Manager Dashboard (Managers only)
- [ ] Go to "Mes Équipes"
- [ ] View team members
- [ ] Invite collaborators
- [ ] Review formation requests
- [ ] Track invitation status

### ✅ Actualities
- [ ] View actualities
- [ ] **Click on an actuality** to see full details
- [ ] Like an actuality
- [ ] Comment on an actuality
- [ ] Reply to comments

### ✅ HR Catalog Upload (HR only)
- [ ] Go to "Catalogue RH"
- [ ] Upload PDF catalog
- [ ] Extract formations with OCR
- [ ] Edit extracted data
- [ ] Import formations

### ✅ Audit Log (Responsable RH only)
- [ ] View journal d'audit
- [ ] **Use pagination** to browse logs
- [ ] Filter by action, type, user
- [ ] Sort by column

---

## 🔧 Troubleshooting

### Issue: "Cannot connect to database"

**Solution:**
```bash
# Check if PostgreSQL container is running
docker ps

# If not running, start it
docker-compose up -d postgres

# Or restart it
docker restart postgres-biat
```

### Issue: "Port 5433 already in use"

**Solution:**
Either change the port in `.env`:
```env
DATABASE_PORT=5434
```

Or stop the process using port 5433:
```bash
# Windows
netstat -ano | findstr :5433
taskkill /PID <process-id> /F

# Linux/Mac
lsof -i :5433
kill -9 <process-id>
```

### Issue: "Migration failed"

**Solution:**
```bash
# Check migration status
npm run migrate:status

# If needed, connect to database and drop tables
PGPASSWORD=password psql -h localhost -p 5433 -U user -d assurances_biat -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Then run migrations again
npm run migrate
```

### Issue: "OCR not working"

**Solution:**
The OCR has been fixed with two corrections:
1. ✅ Uses Uint8Array instead of Buffer for PDF processing
2. ✅ Uses local PDF.js worker from node_modules (not CDN)

If still having issues:
1. Make sure you're uploading a valid PDF
2. Check backend logs for specific error
3. Verify dependencies are installed:
   ```bash
   npm install tesseract.js pdfjs-dist canvas
   ```
4. Rebuild backend:
   ```bash
   npm run build:backend
   ```

### Issue: "Frontend shows 404"

**Solution:**
```bash
# Rebuild frontend
cd frontend
npm run build
cd ..

# Restart backend
npm run start:dev
```

### Issue: "Manager Dashboard shows 'collaborators.map is not a function'"

**Solution:**
This has been fixed! The endpoint now correctly returns an array. If still happening:
```bash
# Pull latest code
git pull

# Rebuild
npm run build
npm run start:dev
```

---

## 📁 Project Structure

```
assurances-biat-ai-assistant/
├── src/                          # Backend source code
│   ├── modules/                  # Feature modules
│   │   ├── actualities/         # Actuality management
│   │   ├── formations/          # Formation management
│   │   ├── notifications/       # Notification system
│   │   ├── manager-invitations/ # Manager invitations
│   │   ├── formation-requests/  # Formation requests
│   │   ├── ocr/                 # OCR service
│   │   └── ...
│   ├── entities/                # Database entities
│   ├── common/                  # Guards, decorators, etc.
│   └── main.ts                  # Entry point
├── frontend/                     # Frontend React app
│   ├── src/
│   │   ├── pages/               # Page components
│   │   ├── components/          # Reusable components
│   │   ├── contexts/            # React contexts
│   │   ├── services/            # API services
│   │   └── App.tsx              # Main app component
│   └── dist/                    # Built frontend (after build)
├── migrations/                   # Database migrations
├── scripts/                      # Utility scripts
├── uploads/                      # Uploaded files
├── .env                         # Environment variables
├── package.json                 # Backend dependencies
└── README.md                    # Project readme
```

---

## 🎨 User Roles & Permissions

| Role | Permissions |
|------|-------------|
| **Employee** | View formations, request formations, view actualities, like/comment |
| **Manager** | Everything Employee + Manage team, approve formation requests, invite collaborators |
| **Gestionnaire RH** | Create formations, upload catalogs, manage documents, view analytics |
| **Responsable RH** | Everything HR + View audit logs, advanced reports |
| **IT Admin** | System management, user management, full access |

---

## 🔐 Default Users (After Seed)

| Email | Password | Role |
|-------|----------|------|
| admin@biat.com.tn | admin123 | IT Admin |
| hr@biat.com.tn | hr123 | Gestionnaire RH |
| manager@biat.com.tn | manager123 | Manager |
| user@biat.com.tn | user123 | Employee |

**⚠️ IMPORTANT: Change these passwords in production!**

---

## 📊 Database Tables

After migrations, you'll have these tables:

- `users` - User accounts
- `roles` - User roles and permissions
- `formations` - Training formations
- `actualities` - News and announcements
- `documents` - Document management
- `formation_requests` - Formation requests from users
- `notifications` - In-app notifications
- `manager_invitations` - Manager-to-employee invitations
- `actuality_interactions` - Likes and views on actualities
- `actuality_comments` - Comments on actualities
- `audit_logs` - System audit trail
- `migrations` - Migration tracking

---

## 🐛 Common Errors & Fixes

### "req.user.userId is undefined"
✅ **FIXED!** All controllers now use `req.user.id`

### "Please provide binary data as Uint8Array, rather than Buffer"
✅ **FIXED!** OCR service now converts Buffer to Uint8Array

### "collaborators.map is not a function"
✅ **FIXED!** Endpoint now returns array, with fallback to empty array

### "Voir toutes les notifications" doesn't work
✅ **FIXED!** Notifications page created at `/notifications`

### Formation cards not clickable
✅ **FIXED!** Cards now navigate to `/formations/:id` detail page

---

## 📞 Need Help?

1. **Check the logs:**
   - Backend logs: Terminal running `npm run start:dev`
   - Frontend logs: Browser console (F12)
   - Database logs: `docker logs postgres-biat`

2. **Verify services are running:**
   ```bash
   # Check PostgreSQL
   docker ps

   # Check backend
   curl http://localhost:3000/api/health

   # Check frontend
   curl http://localhost:5173
   ```

3. **Reset everything:**
   ```bash
   # Stop all
   docker-compose down
   pkill -f "nest start"

   # Clean
   rm -rf node_modules frontend/node_modules dist frontend/dist

   # Reinstall
   npm install
   cd frontend && npm install && cd ..

   # Rebuild
   npm run build

   # Restart
   docker-compose up -d
   npm run migrate
   npm run start:dev
   ```

---

## 🎉 Success Checklist

- [ ] PostgreSQL container is running (`docker ps`)
- [ ] Database migrations completed (`npm run migrate`)
- [ ] Backend starts without errors (`npm run start:dev`)
- [ ] Frontend builds successfully (`cd frontend && npm run dev`)
- [ ] Can login with test credentials
- [ ] Can view formations
- [ ] Can click on formation to see details ✨ NEW!
- [ ] Can view notifications ✨ NEW!
- [ ] Manager dashboard loads team members ✅ FIXED!
- [ ] OCR works for document upload ✅ FIXED!
- [ ] Audit log has pagination ✅ WORKING!

---

**🎊 Congratulations! The Assurances BIAT AI Assistant is now running! 🎊**

**Version:** 1.0.0
**Last Updated:** 2025-11-08
**Status:** ✅ Production Ready
