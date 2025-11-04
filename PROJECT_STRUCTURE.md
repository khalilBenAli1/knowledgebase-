# Project Structure

Complete file structure of the Assurances BIAT AI Assistant project.

```
assurances-biat-ai-assistant/
│
├── README.md                           # Main project documentation
├── PROJECT_STRUCTURE.md                # This file
├── package.json                        # Backend dependencies & scripts
├── tsconfig.json                       # TypeScript configuration
├── nest-cli.json                       # NestJS CLI configuration
├── .env.example                        # Environment variables template
├── .gitignore                          # Git ignore rules
│
├── docs/                               # Documentation
│   ├── QUICKSTART.md                   # Quick start guide
│   ├── DEPLOYMENT.md                   # Production deployment guide
│   ├── DATABASE_SCHEMA.md              # Database schema documentation
│   │
│   ├── api/                            # API endpoint documentation
│   │   ├── auth.md                     # Authentication endpoints
│   │   └── chat.md                     # Chat endpoints
│   │
│   ├── backend/                        # Backend service documentation
│   │   ├── rag-service.md              # RAG service details
│   │   └── ingestion-service.md        # Document ingestion details
│   │
│   └── frontend/                       # Frontend component documentation
│       ├── ChatPage.md                 # Chat page component
│       └── DocumentsPage.md            # Documents page component
│
├── src/                                # Backend source code
│   ├── main.ts                         # Application entry point
│   ├── app.module.ts                   # Root application module
│   │
│   ├── common/                         # Shared utilities
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts      # Role-based access decorator
│   │   │   └── current-user.decorator.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts       # JWT authentication guard
│   │       └── roles.guard.ts          # Role authorization guard
│   │
│   ├── entities/                       # TypeORM database entities
│   │   ├── user.entity.ts
│   │   ├── role.entity.ts
│   │   ├── document.entity.ts
│   │   ├── document-chunk.entity.ts
│   │   ├── chat-session.entity.ts
│   │   ├── chat-message.entity.ts
│   │   ├── feedback.entity.ts
│   │   └── audit-log.entity.ts
│   │
│   └── modules/                        # Feature modules
│       │
│       ├── auth/                       # Authentication module
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts
│       │   ├── auth.service.ts
│       │   ├── auth.service.spec.ts    # Unit tests
│       │   ├── dto/
│       │   │   └── login.dto.ts
│       │   └── strategies/
│       │       ├── jwt.strategy.ts
│       │       └── local.strategy.ts
│       │
│       ├── users/                      # User management
│       │   ├── users.module.ts
│       │   ├── users.controller.ts
│       │   ├── users.service.ts
│       │   └── dto/
│       │       ├── create-user.dto.ts
│       │       └── update-user.dto.ts
│       │
│       ├── roles/                      # Role management
│       │   ├── roles.module.ts
│       │   ├── roles.controller.ts
│       │   └── roles.service.ts
│       │
│       ├── documents/                  # Document management
│       │   ├── documents.module.ts
│       │   ├── documents.controller.ts
│       │   └── documents.service.ts
│       │
│       ├── ingestion/                  # Document processing pipeline
│       │   ├── ingestion.module.ts
│       │   ├── ingestion.controller.ts
│       │   ├── ingestion.service.ts
│       │   └── parser.service.ts       # PDF/DOCX parsing
│       │
│       ├── llm/                        # LLM provider abstraction
│       │   ├── llm.module.ts
│       │   ├── llm.service.ts
│       │   ├── interfaces/
│       │   │   └── llm-provider.interface.ts
│       │   └── providers/
│       │       └── ollama.provider.ts  # Ollama implementation
│       │
│       ├── rag/                        # Retrieval-Augmented Generation
│       │   ├── rag.module.ts
│       │   ├── rag.service.ts
│       │   └── rag.service.spec.ts     # Unit tests
│       │
│       ├── chat/                       # Chat functionality
│       │   ├── chat.module.ts
│       │   ├── chat.controller.ts
│       │   ├── chat.service.ts
│       │   └── dto/
│       │       └── chat.dto.ts
│       │
│       ├── feedback/                   # User feedback system
│       │   ├── feedback.module.ts
│       │   ├── feedback.controller.ts
│       │   ├── feedback.service.ts
│       │   └── dto/
│       │       └── create-feedback.dto.ts
│       │
│       ├── audit/                      # Audit logging
│       │   ├── audit.module.ts
│       │   ├── audit.controller.ts
│       │   └── audit.service.ts
│       │
│       ├── admin/                      # Admin analytics
│       │   ├── admin.module.ts
│       │   ├── admin.controller.ts
│       │   └── admin.service.ts
│       │
│       └── health/                     # Health checks
│           ├── health.module.ts
│           ├── health.controller.ts
│           └── health.service.ts
│
├── frontend/                           # React frontend application
│   ├── package.json                    # Frontend dependencies
│   ├── tsconfig.json                   # Frontend TypeScript config
│   ├── vite.config.ts                  # Vite build configuration
│   ├── tailwind.config.js              # Tailwind CSS config
│   ├── postcss.config.js               # PostCSS config
│   ├── index.html                      # HTML entry point
│   │
│   └── src/
│       ├── main.tsx                    # React entry point
│       ├── App.tsx                     # Root component with routing
│       ├── index.css                   # Global styles
│       │
│       ├── pages/                      # Page components
│       │   ├── LoginPage.tsx
│       │   ├── LoginPage.test.tsx      # Component tests
│       │   ├── ChatPage.tsx            # Main chat interface
│       │   ├── DocumentsPage.tsx       # Document management
│       │   ├── AdminPage.tsx           # Analytics dashboard
│       │   └── AuditPage.tsx           # Audit log viewer
│       │
│       ├── components/                 # Reusable components
│       │   ├── Layout.tsx              # Main layout with nav
│       │   ├── ChatMessage.tsx         # Message display
│       │   ├── ChatMessage.test.tsx    # Component tests
│       │   └── SourcesList.tsx         # Citations display
│       │
│       ├── store/                      # State management
│       │   └── authStore.ts            # Zustand auth store
│       │
│       └── services/                   # API client services
│           └── api.ts                  # Axios configuration
│
├── logs/                               # Application logs (gitignored)
│   ├── error.log
│   └── combined.log
│
└── uploads/                            # Uploaded documents (gitignored)
    └── [user-uploaded-files]
```

## File Count Summary

- **Backend Files:** ~60 TypeScript files
- **Frontend Files:** ~15 TypeScript/TSX files
- **Tests:** ~5 test files (representative samples)
- **Documentation:** ~10 markdown files
- **Configuration:** ~10 config files
- **Total:** ~100 project files

## Key Directories

### `/src/modules/`
Contains all backend feature modules. Each module follows NestJS conventions with:
- `*.module.ts` - Module definition
- `*.controller.ts` - HTTP endpoints
- `*.service.ts` - Business logic
- `*.spec.ts` - Unit tests
- `dto/` - Data transfer objects

### `/src/entities/`
TypeORM entity definitions for database tables. Each entity maps to a PostgreSQL table.

### `/frontend/src/pages/`
React page components for main application routes. Each page is a full-screen view.

### `/frontend/src/components/`
Reusable React components used across multiple pages.

### `/docs/`
Comprehensive documentation including:
- Setup guides (QUICKSTART.md)
- API documentation (api/)
- Service documentation (backend/)
- Component documentation (frontend/)
- Deployment guide (DEPLOYMENT.md)
- Database schema (DATABASE_SCHEMA.md)

## Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template |
| `package.json` | Backend dependencies and scripts |
| `tsconfig.json` | Backend TypeScript configuration |
| `nest-cli.json` | NestJS CLI settings |
| `frontend/package.json` | Frontend dependencies |
| `frontend/tsconfig.json` | Frontend TypeScript config |
| `frontend/vite.config.ts` | Vite bundler settings |
| `frontend/tailwind.config.js` | Tailwind CSS theme |

## Build Output

After running `npm run build`:

```
dist/                                   # Compiled backend
├── main.js
├── app.module.js
├── modules/
└── entities/

frontend/dist/                          # Compiled frontend
├── index.html
├── assets/
│   ├── index-[hash].js
│   └── index-[hash].css
└── vite.svg
```

## Runtime Directories

```
uploads/                                # User uploaded documents
logs/                                   # Application logs
node_modules/                           # Dependencies
frontend/node_modules/                  # Frontend dependencies
```

## Entry Points

- **Backend Development:** `src/main.ts` via `npm run start:dev`
- **Frontend Development:** `frontend/src/main.tsx` via `npm run dev`
- **Backend Production:** `dist/main.js` via `npm run start:prod`
- **Frontend Production:** Served by NestJS from `frontend/dist/`

## Import Paths

Backend uses path aliases:
```typescript
import { User } from '@/entities/user.entity';  // Not implemented yet
```

Frontend uses relative imports:
```typescript
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
```

---

**Generated:** January 2025
**Project Version:** 1.0.0
