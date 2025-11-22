# Deployment Guide

## Production Deployment Checklist

### Pre-Deployment

- [ ] Review and update all environment variables
- [ ] Change JWT_SECRET to a secure random value
- [ ] Set NODE_ENV=production
- [ ] Configure production database
- [ ] Set up SSL/TLS certificates
- [ ] Configure firewall rules
- [ ] Set up backup strategy
- [ ] Review CORS settings
- [ ] Test all features in staging environment

### Environment Variables (Production)

```env
# Server
PORT=3000
NODE_ENV=production

# Database
DATABASE_URL=postgres://prod_user:secure_password@db-host:5432/assurances_biat_prod
PGVECTOR_ENABLED=true

# Auth - CHANGE THESE!
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_EXPIRES_IN=3600
ENABLE_SSO=false

# File storage
UPLOAD_DIR=/var/app/uploads
MAX_FILE_SIZE=10485760

# RAG
CHUNK_SIZE=800
CHUNK_OVERLAP=150
EMBEDDING_PROVIDER=openai
EMBEDDING_MODEL=text-embedding-3-small
SIMILARITY_THRESHOLD=0.7
TOP_K_RESULTS=5

# LLM
LLM_PROVIDER=openai
LLM_ENDPOINT=https://api.openai.com/v1
LLM_MODEL=gpt-5-nano
LLM_TEMPERATURE=0.3
LLM_MAX_TOKENS=1000
OPENAI_API_KEY=your_openai_api_key

# Logging
LOG_LEVEL=info

# Frontend
FRONTEND_BUILD_PATH=./frontend/dist

# CORS
CORS_ORIGIN=https://your-domain.com
```

## Database Setup

### 1. Create Production Database

```bash
createdb assurances_biat_prod
```

### 2. Enable Extensions

```sql
-- Connect to database
psql assurances_biat_prod

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify
\dx
```

### 3. Run Migrations

```bash
npm run migration:run
```

### 4. Create Indexes

```sql
-- Performance index for vector search
CREATE INDEX idx_chunks_embedding ON document_chunks
USING hnsw (embedding vector_cosine_ops);

-- Index for published documents
CREATE INDEX idx_docs_status ON documents(status);

-- Index for chat sessions
CREATE INDEX idx_sessions_user ON chat_sessions(userId);
```

### 5. Create Initial Roles and Admin User

```sql
-- Insert roles
INSERT INTO roles (id, name, permissions, "createdAt") VALUES
  (gen_random_uuid(), 'User', '{}', NOW()),
  (gen_random_uuid(), 'HR Admin', '{}', NOW()),
  (gen_random_uuid(), 'Legal Admin', '{}', NOW()),
  (gen_random_uuid(), 'IT Admin', '{}', NOW());

-- Get IT Admin role ID
SELECT id FROM roles WHERE name = 'IT Admin';

-- Create admin user (replace <role-id> and <hashed-password>)
-- Generate password hash: bcrypt('your-password', 10)
INSERT INTO users (id, name, email, "passwordHash", "roleId", "isActive", "createdAt", "updatedAt") VALUES
  (gen_random_uuid(), 'IT Admin', 'admin@biat.com', '<hashed-password>', '<role-id>', true, NOW(), NOW());
```

## Application Build

### 1. Install Dependencies

```bash
npm ci --production
cd frontend && npm ci --production && cd ..
```

### 2. Build Frontend

```bash
cd frontend
npm run build
cd ..
```

### 3. Build Backend

```bash
npm run build
```

## Deployment Options

### Option 1: Direct Server Deployment

#### Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

#### Install PostgreSQL
```bash
sudo apt-get install postgresql postgresql-contrib
```

#### Configure OpenAI Access
1. Create or reuse an API key from [platform.openai.com](https://platform.openai.com/).
2. Ensure the account has access to `gpt-5-nano` and `text-embedding-3-small`.
3. Store the key securely on the server (e.g., `/etc/assurances-biat/.env`) and export `OPENAI_API_KEY`.
4. Restrict outbound network access so only `https://api.openai.com` is reachable if possible.

#### Deploy Application
```bash
# Create app directory
sudo mkdir -p /var/app/assurances-biat
cd /var/app/assurances-biat

# Copy files
sudo cp -r /path/to/build/* .

# Create uploads directory
sudo mkdir -p uploads
sudo chown -R www-data:www-data uploads

# Install PM2 for process management
sudo npm install -g pm2

# Start application
pm2 start dist/main.js --name assurances-biat

# Save PM2 config
pm2 save
pm2 startup
```

### Option 2: Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY frontend/package*.json ./frontend/

# Install dependencies
RUN npm ci
RUN cd frontend && npm ci

# Copy source
COPY . .

# Build
RUN cd frontend && npm run build
RUN npm run build

# Production image
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/frontend/dist ./frontend/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  db:
    image: pgvector/pgvector:pg14
    environment:
      POSTGRES_DB: assurances_biat
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - biat-network

  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgres://postgres:${DB_PASSWORD}@db:5432/assurances_biat
      - LLM_ENDPOINT=https://api.openai.com/v1
      - LLM_MODEL=gpt-5-nano
      - EMBEDDING_MODEL=text-embedding-3-small
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
    volumes:
      - uploads:/app/uploads
    networks:
      - biat-network

volumes:
  postgres_data:
  uploads:

networks:
  biat-network:
```

Deploy:
```bash
docker-compose up -d
```

## Reverse Proxy Setup (Nginx)

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    client_max_body_size 20M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Monitoring

### Application Logs

```bash
# PM2 logs
pm2 logs assurances-biat

# Application logs
tail -f logs/combined.log
tail -f logs/error.log
```

### Health Check

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Database Monitoring

```sql
-- Check database size
SELECT pg_size_pretty(pg_database_size('assurances_biat_prod'));

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Active connections
SELECT count(*) FROM pg_stat_activity;
```

## Backup Strategy

### Database Backups

```bash
# Daily backup script
#!/bin/bash
BACKUP_DIR="/var/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
pg_dump assurances_biat_prod > $BACKUP_DIR/backup_$TIMESTAMP.sql
gzip $BACKUP_DIR/backup_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

Schedule with cron:
```bash
0 2 * * * /path/to/backup-script.sh
```

### File Backups

Backup uploads directory:
```bash
rsync -av /var/app/uploads/ /var/backups/uploads/
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable
```

### 2. SSL/TLS Setup

Use Let's Encrypt:
```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 3. Rate Limiting

Add to Nginx config:
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

location /api/ {
    limit_req zone=api burst=20;
    # ... other config
}
```

### 4. Security Headers

```nginx
add_header X-Frame-Options "SAMEORIGIN";
add_header X-Content-Type-Options "nosniff";
add_header X-XSS-Protection "1; mode=block";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```

## Maintenance

### Update Application

```bash
# Pull latest code
git pull origin main

# Install dependencies
npm ci

# Build
cd frontend && npm run build && cd ..
npm run build

# Restart
pm2 restart assurances-biat
```

### Database Maintenance

```sql
-- Vacuum and analyze
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE assurances_biat_prod;
```

## Troubleshooting

### Application Won't Start

1. Check logs: `pm2 logs assurances-biat`
2. Verify environment variables
3. Check database connectivity
4. Confirm `OPENAI_API_KEY` is configured and the server can reach https://api.openai.com

### High Memory Usage

1. Check for memory leaks in logs
2. Increase Node.js heap size: `node --max-old-space-size=4096 dist/main.js`
3. Monitor with `pm2 monit`

### Slow Queries

1. Enable query logging in PostgreSQL
2. Check for missing indexes
3. Analyze slow queries with `EXPLAIN ANALYZE`

## Rollback Procedure

```bash
# Stop application
pm2 stop assurances-biat

# Restore database backup
gunzip < /var/backups/postgres/backup_YYYYMMDD_HHMMSS.sql.gz | psql assurances_biat_prod

# Revert code
git checkout <previous-commit>
npm ci
cd frontend && npm run build && cd ..
npm run build

# Start application
pm2 start assurances-biat
```

---

**For Support:** Contact IT Admin team
**Last Updated:** January 2025
