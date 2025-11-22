# Assurances BIAT - Internal Regulations AI Assistant

A secure, explainable AI chatbot platform that answers employees' questions about internal documents using Retrieval-Augmented Generation (RAG).

## 🎯 Project Goals

- Provide instant, accurate answers to employee questions about internal regulations
- Ensure all answers include citations (document name, chapter, article, page)
- Implement role-based access control (User, HR Admin, Legal Admin, IT Admin)
- Maintain full audit trail of all interactions
- Use only free/open-source technologies where possible

## 🏗️ Architecture

### Tech Stack

**Backend:**
- NestJS (TypeScript)
- PostgreSQL with pgvector extension
- TypeORM for database access
- JWT authentication
- Passport.js for auth strategies

**Frontend:**
- React 18 (TypeScript)
- Vite for build tooling
- Tailwind CSS for styling
- Zustand for state management
- React Router for navigation

**AI/ML:**
- OpenAI GPT-5 Nano (Chat Completions API)
- OpenAI `text-embedding-3-small` embeddings
- RAG pipeline with vector similarity search

**Document Processing:**
- pdf-parse for PDF extraction
- mammoth for DOCX extraction

## 📋 Prerequisites

Before starting, ensure you have:

- Node.js 18+ and npm
- PostgreSQL 14+
- An OpenAI account with access to ChatGPT 5 Nano and embeddings (`text-embedding-3-small`)

### OpenAI Setup

1. Create an API key on [platform.openai.com](https://platform.openai.com/).
2. Confirm the account can use `gpt-5-nano` and `text-embedding-3-small`.
3. Store the key securely (e.g., in `.env` as `OPENAI_API_KEY`) and restrict outbound traffic to `https://api.openai.com`.

## 🚀 Installation

### 1. Clone and Install Dependencies

```bash
cd assurances-biat-ai-assistant

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Database Setup

Create PostgreSQL database:
```bash
createdb assurances_biat
```

Enable pgvector extension:
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### 3. Environment Configuration

Copy example environment file:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Server
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=postgres://username:password@localhost:5432/assurances_biat
PGVECTOR_ENABLED=true

# Auth
JWT_SECRET=your-secure-secret-key-change-this
JWT_EXPIRES_IN=3600

# File storage
UPLOAD_DIR=./uploads

# RAG Configuration
CHUNK_SIZE=800
CHUNK_OVERLAP=150
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
TOP_K_RESULTS=5

# LLM Configuration
LLM_ENDPOINT=https://api.openai.com/v1
LLM_MODEL=gpt-5-nano
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=1000
OPENAI_API_KEY=sk-your-key
```

### 4. Database Migration

Run TypeORM synchronization (development only):
```bash
npm run start:dev
```

For production, generate and run migrations:
```bash
npm run migration:generate -- -n InitialMigration
npm run migration:run
```

### 5. Seed Initial Data

Create roles and admin user manually or via seed script.

Example SQL:
```sql
-- Insert roles
INSERT INTO roles (id, name, permissions, "createdAt") VALUES
  ('uuid1', 'User', '{}', NOW()),
  ('uuid2', 'HR Admin', '{}', NOW()),
  ('uuid3', 'Legal Admin', '{}', NOW()),
  ('uuid4', 'IT Admin', '{}', NOW());

-- Create admin user (password: admin123)
INSERT INTO users (id, name, email, "passwordHash", "roleId", "isActive", "createdAt", "updatedAt") VALUES
  ('uuid5', 'Admin', 'admin@biat.com', '$2b$10$...', 'uuid4', true, NOW(), NOW());
```

## 🏃 Running the Application

### Development Mode

Terminal 1 - Backend:
```bash
npm run start:dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000/api
- Health check: http://localhost:3000/api/health

### Production Mode

Build both frontend and backend:
```bash
npm run build
```

Start production server:
```bash
npm run start:prod
```

The backend will serve the built React app at http://localhost:3000

## 👥 User Roles & Permissions

### User (Employee)
- ✅ Chat with AI assistant
- ✅ View source citations
- ✅ Submit feedback on answers

### HR Admin
- ✅ All User permissions
- ✅ Upload documents (PDF, DOCX)
- ✅ Trigger document processing
- ✅ Publish approved documents
- ✅ View usage analytics

### Legal Admin
- ✅ All User permissions
- ✅ Approve documents for publication
- ✅ View audit logs
- ✅ Review document sources used in answers

### IT Admin
- ✅ All permissions
- ✅ Manage users and roles
- ✅ System configuration
- ✅ Reindex documents
- ✅ View system health

## 📄 Document Workflow

1. **Upload** (HR Admin) → Document status: `uploaded`
2. **Process** (HR Admin triggers) → Parsing, chunking, embedding → Status: `parsed`
3. **Approve** (Legal Admin) → Legal review → Status: `approved`
4. **Publish** (HR Admin) → Make available to chatbot → Status: `published`

Only `published` documents are used by the AI to answer questions.

## 🔍 RAG Pipeline

### 1. Document Ingestion
- Parse PDF/DOCX to extract text
- Split into overlapping chunks (800 chars, 150 overlap)
- Generate embeddings for each chunk
- Store in PostgreSQL with pgvector

### 2. Query Processing
- User asks question
- Generate query embedding
- Find top-K similar chunks using cosine similarity
- Retrieve source metadata

### 3. Answer Generation
- Build prompt with retrieved context
- Call LLM to generate answer
- Extract and format citations
- Return answer with sources

### 4. Citation Format
Every answer includes:
- Document name
- Section/Chapter (if available)
- Article number (if available)
- Page number (if available)

## 📊 API Documentation

Detailed API documentation available in `/docs/api/`:
- [Authentication](docs/api/auth.md)
- [Chat](docs/api/chat.md)
- [Documents](docs/api/documents.md)
- [Feedback](docs/api/feedback.md)
- [Admin](docs/api/admin.md)

## 🧪 Testing

### Backend Tests
```bash
# Run all tests
npm test

# Run with coverage
npm run test:cov

# Run in watch mode
npm run test:watch
```

### Frontend Tests
```bash
cd frontend

# Run tests
npm test

# Run with UI
npm run test:ui
```

## 📚 Documentation

- `/docs/api/` - REST API endpoints
- `/docs/backend/` - Backend services documentation
- `/docs/frontend/` - React components documentation
- `/docs/deployment/` - Deployment guides

## 🔒 Security Considerations

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens for authentication
- ✅ Role-based access control on all endpoints
- ✅ Input validation with class-validator
- ✅ SQL injection prevention via TypeORM parameterization
- ✅ CORS configuration
- ✅ Audit logging for sensitive operations

**⚠️ Before Production:**
- Change JWT_SECRET to a strong random value
- Enable HTTPS
- Configure firewall rules
- Set up regular database backups
- Review and harden CORS settings
- Consider implementing rate limiting

## 🔧 Configuration

Key environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| DATABASE_URL | PostgreSQL connection string | - |
| JWT_SECRET | Secret for JWT signing | changeme |
| CHUNK_SIZE | Characters per chunk | 800 |
| CHUNK_OVERLAP | Overlap between chunks | 150 |
| LLM_ENDPOINT | OpenAI API endpoint | https://api.openai.com/v1 |
| LLM_MODEL | Model to use for generation | gpt-5-nano |
| EMBEDDING_MODEL | Model for embeddings | text-embedding-3-small |
| OPENAI_API_KEY | API key for OpenAI requests | (none) |
| TOP_K_RESULTS | Number of chunks to retrieve | 5 |

## 🐛 Troubleshooting

### Database Connection Errors
- Verify PostgreSQL is running
- Check DATABASE_URL is correct
- Ensure pgvector extension is installed

### LLM Not Responding
- Verify `OPENAI_API_KEY` is configured and valid
- Check `LLM_ENDPOINT` (default `https://api.openai.com/v1`)
- Confirm your OpenAI account has access to `gpt-5-nano`

### Frontend Can't Reach Backend
- Check backend is running on PORT 3000
- Verify CORS settings allow frontend origin
- Check browser console for errors

### Document Processing Fails
- Check file format (PDF or DOCX only)
- Verify file size under MAX_FILE_SIZE
- Confirm the embedding model (`text-embedding-3-small`) is available in your OpenAI subscription
- Review logs for parsing errors

## 📈 Performance Tuning

### Database
- Create indexes on frequently queried columns
- Use connection pooling
- Consider read replicas for scaling

### Vector Search
- Create HNSW index on embedding column:
  ```sql
  CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
  ```

### LLM
- Use smaller models for faster responses
- Implement request caching for common questions
- Consider batching embedding generation

## 🚢 Deployment

### Docker Deployment
(Add Dockerfile and docker-compose.yml for containerized deployment)

### Environment-Specific Settings

**Development:**
- TypeORM synchronize: true
- Detailed logging
- CORS allows localhost

**Production:**
- TypeORM synchronize: false (use migrations)
- Minimal logging
- Strict CORS
- HTTPS only
- Environment secrets management

## 📝 License

Proprietary - Assurances BIAT Internal Use Only

## 🤝 Support

For issues or questions:
- Check documentation in `/docs/`
- Review troubleshooting section
- Contact IT Admin team

## 🗺️ Roadmap

- [ ] Add OCR support for scanned PDFs
- [ ] Implement conversation export
- [ ] Add multi-language support
- [ ] Create mobile app
- [ ] Implement advanced analytics dashboard
- [ ] Add document versioning
- [ ] Support for additional file formats (Excel, PowerPoint)
- [ ] Implement background job queue for processing
- [ ] Add email notifications for workflow steps
- [ ] SSO integration (SAML, OAuth)

---

**Generated with Assurances BIAT IT Team**
Version 1.0.0 - January 2025
