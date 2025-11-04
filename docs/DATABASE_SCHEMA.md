# Database Schema Documentation

## Overview

The database uses PostgreSQL with the pgvector extension for vector similarity search. All tables use UUID primary keys for security and scalability.

## Entity Relationship Diagram

```
┌─────────────┐
│   roles     │
│─────────────│
│ id (PK)     │
│ name        │──┐
│ permissions │  │
└─────────────┘  │
                 │
                 │ 1:N
                 │
┌─────────────┐  │
│   users     │◄─┘
│─────────────│
│ id (PK)     │──┐
│ name        │  │
│ email       │  │
│ passwordHash│  │
│ roleId (FK) │  │
│ isActive    │  │
└─────────────┘  │
       │         │
       │ 1:N     │ 1:N
       │         │
       ▼         ▼
┌──────────────┐  ┌─────────────┐
│chat_sessions │  │  documents  │
│──────────────│  │─────────────│
│ id (PK)      │  │ id (PK)     │──┐
│ userId (FK)  │  │ name        │  │
│ title        │  │ filename    │  │
│ startedAt    │  │ mimeType    │  │
└──────────────┘  │ uploaderId  │  │
       │          │ status      │  │
       │ 1:N      │ version     │  │
       │          └─────────────┘  │
       ▼                           │ 1:N
┌──────────────┐                   │
│chat_messages │                   │
│──────────────│                   ▼
│ id (PK)      │         ┌──────────────────┐
│ sessionId(FK)│         │ document_chunks  │
│ userId (FK)  │         │──────────────────│
│ role         │         │ id (PK)          │
│ content      │         │ documentId (FK)  │
│ sourceRefs   │         │ chunkText        │
└──────────────┘         │ chunkIndex       │
       │                 │ embedding        │ ← pgvector
       │ 1:N             │ page             │
       │                 │ heading          │
       ▼                 │ articleRef       │
┌──────────────┐         └──────────────────┘
│  feedback    │
│──────────────│
│ id (PK)      │
│ messageId(FK)│
│ userId (FK)  │
│ rating       │
│ comment      │
└──────────────┘

┌─────────────┐
│ audit_logs  │
│─────────────│
│ id (PK)     │
│ actorId(FK) │
│ action      │
│ targetType  │
│ targetId    │
│ payload     │
│ timestamp   │
└─────────────┘
```

## Tables

### users

Stores user accounts and authentication information.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(255) | User's full name |
| email | VARCHAR(255) | Unique email address |
| passwordHash | VARCHAR | Bcrypt hashed password |
| externalId | VARCHAR | External SSO identifier (optional) |
| roleId | UUID | Foreign key to roles table |
| isActive | BOOLEAN | Account status |
| createdAt | TIMESTAMP | Creation timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (email)
- INDEX (roleId)

---

### roles

Defines user roles and permissions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(100) | Role name (User, HR Admin, Legal Admin, IT Admin) |
| permissions | JSONB | Permission flags |
| createdAt | TIMESTAMP | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (name)

---

### documents

Stores metadata about uploaded documents.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| name | VARCHAR(500) | Document display name |
| originalFilename | VARCHAR(500) | Original uploaded filename |
| mimeType | VARCHAR(100) | File MIME type |
| uploaderId | UUID | Foreign key to users |
| status | ENUM | Workflow status |
| version | VARCHAR | Document version |
| tags | JSONB | Array of tags |
| category | TEXT | Document category |
| department | TEXT | Associated department |
| filePath | VARCHAR | Path to file on disk |
| approvedBy | UUID | User who approved |
| approvedAt | TIMESTAMP | Approval timestamp |
| createdAt | TIMESTAMP | Upload timestamp |
| updatedAt | TIMESTAMP | Last update timestamp |

**Status Values:**
- `uploaded` - Just uploaded
- `parsed` - Text extracted and chunked
- `awaiting_approval` - Ready for review
- `approved` - Approved by Legal
- `published` - Available to chatbot
- `unpublished` - Removed from chatbot

**Indexes:**
- PRIMARY KEY (id)
- INDEX (uploaderId)
- INDEX (status)

---

### document_chunks

Stores document text chunks with vector embeddings.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| documentId | UUID | Foreign key to documents |
| chunkText | TEXT | The actual text content |
| chunkIndex | INTEGER | Chunk sequence number |
| embedding | VECTOR | Vector embedding (pgvector) |
| page | INTEGER | Page number (if available) |
| heading | TEXT | Section heading (if available) |
| articleRef | TEXT | Article reference (if available) |
| metadata | JSONB | Additional metadata |
| createdAt | TIMESTAMP | Creation timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (documentId)
- HNSW INDEX (embedding) ← For fast similarity search

**Vector Embedding:**
- Dimension depends on model (typically 384 or 768)
- Uses cosine similarity for search
- Index type: HNSW (Hierarchical Navigable Small World)

---

### chat_sessions

Stores chat conversation sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| userId | UUID | Foreign key to users |
| title | VARCHAR(500) | Session title (first question) |
| startedAt | TIMESTAMP | Session start time |
| endedAt | TIMESTAMP | Session end time (optional) |
| isActive | BOOLEAN | Active status |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (userId)

---

### chat_messages

Stores individual messages in chat sessions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| sessionId | UUID | Foreign key to chat_sessions |
| userId | UUID | Foreign key to users (NULL for assistant) |
| role | ENUM | Message role (user, assistant, system) |
| content | TEXT | Message content |
| sourceRefs | JSONB | Array of source references |
| createdAt | TIMESTAMP | Message timestamp |

**Source References Format:**
```json
[
  {
    "documentId": "uuid",
    "documentName": "Règlement Intérieur",
    "page": 12,
    "article": "Article 15",
    "heading": "Congés",
    "chunkId": "uuid"
  }
]
```

**Indexes:**
- PRIMARY KEY (id)
- INDEX (sessionId)
- INDEX (userId)

---

### feedback

Stores user feedback on assistant responses.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| messageId | UUID | Foreign key to chat_messages |
| userId | UUID | Foreign key to users |
| rating | ENUM | useful or not_useful |
| comment | TEXT | Optional comment |
| createdAt | TIMESTAMP | Feedback timestamp |

**Indexes:**
- PRIMARY KEY (id)
- INDEX (messageId)
- INDEX (userId)

---

### audit_logs

Comprehensive audit trail of system actions.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| actorId | UUID | Foreign key to users (who did it) |
| action | ENUM | Action type |
| targetType | VARCHAR(100) | Type of entity affected |
| targetId | VARCHAR | ID of entity affected |
| payload | JSONB | Action details |
| ipAddress | VARCHAR(100) | Client IP address |
| userAgent | VARCHAR(500) | Client user agent |
| timestamp | TIMESTAMP | When it happened |

**Action Types:**
- `user_login`, `user_logout`
- `document_upload`, `document_approve`, `document_publish`, `document_delete`
- `chat_query`
- `feedback_submit`
- `user_create`, `user_update`, `user_delete`
- `role_update`, `system_config_update`

**Indexes:**
- PRIMARY KEY (id)
- INDEX (actorId)
- INDEX (action)
- INDEX (timestamp)

---

## Database Size Estimates

Assuming:
- 100 users
- 50 documents (average 30 pages each)
- 1000 chunks per document
- 500 chat sessions per month

| Table | Estimated Size |
|-------|----------------|
| users | <1 MB |
| roles | <1 KB |
| documents | <1 MB |
| document_chunks | ~200 MB (50K chunks × 4KB avg) |
| chat_sessions | ~5 MB |
| chat_messages | ~50 MB |
| feedback | ~2 MB |
| audit_logs | ~20 MB |
| **Total** | ~280 MB |

After 1 year of operation: ~1-2 GB

---

## Performance Optimization

### Essential Indexes

```sql
-- Vector similarity search (REQUIRED for good performance)
CREATE INDEX idx_chunks_embedding ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- Document filtering
CREATE INDEX idx_docs_status ON documents(status);

-- Chat queries
CREATE INDEX idx_sessions_user ON chat_sessions(userId);
CREATE INDEX idx_messages_session ON chat_messages(sessionId);

-- Audit queries
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
```

### Query Optimization Examples

**Vector Search (with index):**
```sql
SELECT * FROM document_chunks
WHERE embedding <=> '[0.1, 0.2, ...]'::vector
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```
Performance: ~10-50ms for 50K chunks

**Published Documents Only:**
```sql
SELECT c.* FROM document_chunks c
JOIN documents d ON c.documentId = d.id
WHERE d.status = 'published'
  AND c.embedding <=> '[...]'::vector
ORDER BY c.embedding <=> '[...]'::vector
LIMIT 5;
```

---

## Backup & Recovery

### Full Backup
```bash
pg_dump assurances_biat > backup.sql
```

### Restore
```bash
psql assurances_biat < backup.sql
```

### Table-Specific Backup
```bash
pg_dump -t document_chunks assurances_biat > chunks_backup.sql
```

---

## Migrations

Use TypeORM migrations for schema changes:

```bash
# Generate migration
npm run migration:generate -- -n AddDocumentTags

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

---

## Security Considerations

- **Never expose raw database:** Always use backend API
- **Encrypt backups:** Especially for user passwords and sensitive documents
- **Regular vacuuming:** `VACUUM ANALYZE` for performance
- **Monitor connections:** Limit concurrent connections
- **Use read-only replicas:** For analytics queries

---

**Last Updated:** January 2025
