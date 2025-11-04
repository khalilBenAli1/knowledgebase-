# Quick Start Guide

Get the Assurances BIAT AI Assistant running in under 10 minutes!

## Prerequisites

✅ Node.js 18+ installed
✅ PostgreSQL 14+ installed
✅ Ollama installed and running

## Step 1: Install Ollama & Models (5 minutes)

```bash
# Install Ollama from https://ollama.ai
# Or use:
curl https://ollama.ai/install.sh | sh

# Pull required models
ollama pull llama3
ollama pull sentence-transformers/all-MiniLM-L6-v2

# Start Ollama server
ollama serve
```

## Step 2: Setup Database (2 minutes)

```bash
# Create database
createdb assurances_biat

# Enable pgvector
psql assurances_biat -c "CREATE EXTENSION vector;"
```

## Step 3: Install & Configure (1 minute)

```bash
cd assurances-biat-ai-assistant

# Install dependencies
npm install
cd frontend && npm install && cd ..

# Setup environment
cp .env.example .env

# Edit .env - minimum required:
# DATABASE_URL=postgres://user:password@localhost:5432/assurances_biat
# JWT_SECRET=your-secret-key-here
```

## Step 4: Run Application (1 minute)

```bash
# Terminal 1 - Backend
npm run start:dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

## Step 5: Create Admin User

```sql
-- Connect to database
psql assurances_biat

-- Insert roles
INSERT INTO roles (id, name, permissions, "createdAt") VALUES
  (gen_random_uuid(), 'User', '{}', NOW()),
  (gen_random_uuid(), 'HR Admin', '{}', NOW()),
  (gen_random_uuid(), 'Legal Admin', '{}', NOW()),
  (gen_random_uuid(), 'IT Admin', '{}', NOW());

-- Get IT Admin role ID
SELECT id FROM roles WHERE name = 'IT Admin';
-- Copy the UUID

-- Create admin user (password will be 'admin123')
-- Generate hash: node -e "console.log(require('bcrypt').hashSync('admin123', 10))"
INSERT INTO users (id, name, email, "passwordHash", "roleId", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'Admin User',
  'admin@biat.com',
  '$2b$10$rI7L9gZvN3YXKP6fV8qKUeF5VK4PxZ3xN6Yk0qM7hN3vV5yK8pQ1S',
  '<paste-IT-Admin-role-id-here>',
  true,
  NOW(),
  NOW()
);
```

## Step 6: Access Application

🌐 Open http://localhost:5173

**Login:**
- Email: `admin@biat.com`
- Password: `admin123`

## Step 7: Upload Your First Document

1. Navigate to **Documents** page
2. Click **Upload Document**
3. Select a PDF or DOCX file (e.g., "Règlement Intérieur Assurances BIAT.pdf")
4. Click **Process** to parse and index the document
5. Wait for status to change to **parsed** (~2-5 minutes)
6. As Legal Admin, click **Approve**
7. As HR Admin, click **Publish**

## Step 8: Ask a Question

1. Go back to **Chat** page
2. Ask a question about the document
3. Example: "Quel est le nombre de jours de congé annuel?"
4. View the AI response with source citations!

---

## Troubleshooting

### "Cannot connect to database"
- Check PostgreSQL is running: `pg_isready`
- Verify DATABASE_URL in `.env`

### "LLM endpoint not responding"
- Check Ollama is running: `ollama list`
- Verify it's on port 11434: `curl http://localhost:11434`

### "Document processing stuck"
- Check Ollama has the embedding model: `ollama list | grep MiniLM`
- Check backend logs for errors

### "Frontend won't load"
- Ensure frontend dev server is running on port 5173
- Check browser console for errors
- Verify backend is running on port 3000

---

## Next Steps

📖 Read the full [README.md](../README.md)
🚀 See [DEPLOYMENT.md](DEPLOYMENT.md) for production setup
📊 Check [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for database details
📝 Review [API Documentation](api/)

---

**Need Help?** Check the troubleshooting section in README.md
