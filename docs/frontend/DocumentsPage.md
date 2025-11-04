# DocumentsPage Component

## Overview

Administrative interface for managing internal documents. Allows HR and Legal admins to upload, approve, publish, and track document processing status.

**Location:** `frontend/src/pages/DocumentsPage.tsx`

## Access Control

**Roles with Access:**
- HR Admin (upload, publish)
- Legal Admin (approve)
- IT Admin (view, reindex)

Regular users cannot access this page.

## Features

- **Document Upload:** HR admins can upload PDF and DOCX files
- **Status Tracking:** View processing status of each document
- **Approval Workflow:** Legal admins approve documents before publication
- **Publishing:** HR admins make approved documents available to the chatbot
- **Processing Trigger:** Initiate document parsing and indexing

## State

### Local State
- `documents`: Array of Document objects
- `loading`: Initial load state
- `uploading`: File upload in progress

### User Role Checks
- `isHRAdmin`: Can upload and publish
- `isLegalAdmin`: Can approve

## Document Workflow

```
┌─────────────┐
│  uploaded   │ ──[HR Admin: Process]──┐
└─────────────┘                         │
                                        ▼
                              ┌──────────────────┐
                              │     parsed       │
                              └──────────────────┘
                                        │
                         [Legal Admin: Approve]
                                        │
                                        ▼
                              ┌──────────────────┐
                              │    approved      │
                              └──────────────────┘
                                        │
                          [HR Admin: Publish]
                                        │
                                        ▼
                              ┌──────────────────┐
                              │   published      │ ← Visible to chatbot
                              └──────────────────┘
```

## API Calls

### Load Documents
```typescript
GET /api/documents
```

### Upload Document
```typescript
POST /api/documents/upload
Content-Type: multipart/form-data
Body: FormData with 'file' field
```

### Process Document
```typescript
POST /api/ingestion/process/:id
```

### Approve Document
```typescript
POST /api/documents/:id/approve
```

### Publish Document
```typescript
POST /api/documents/:id/publish
```

## UI Components

### Header
- Page title
- Upload button (HR Admin only)

### Document Table

| Column | Description |
|--------|-------------|
| Name | Document title and filename |
| Status | Current workflow status with color coding |
| Version | Document version number |
| Date | Upload date |
| Actions | Context-specific action buttons |

### Status Colors

```typescript
{
  uploaded: 'bg-gray-200 text-gray-800',
  parsed: 'bg-blue-200 text-blue-800',
  awaiting_approval: 'bg-yellow-200 text-yellow-800',
  approved: 'bg-green-200 text-green-800',
  published: 'bg-green-600 text-white'
}
```

## User Actions by Role

### HR Admin
1. Upload new document (PDF/DOCX)
2. Trigger processing on uploaded documents
3. Publish approved documents

### Legal Admin
1. Review parsed documents
2. Approve documents for publication

### IT Admin
1. View all documents and their status
2. Reindex documents if needed

## File Upload Constraints

- **Accepted Formats:** PDF, DOCX only
- **Max File Size:** 10MB (configurable via MAX_FILE_SIZE env var)
- **Validation:** Done server-side by multer

## Example Usage

Accessed via routing:

```tsx
<Route path="documents" element={<DocumentsPage />} />
```

Protected by authentication and role guards in Layout component.

## Error Handling

- Network errors show console error (TODO: add user-facing toasts)
- Upload failures reset uploading state
- Processing errors logged server-side

## Related Files

- `src/modules/documents/documents.controller.ts` - Backend API
- `src/modules/ingestion/ingestion.controller.ts` - Processing API
- `components/Layout.tsx` - Access control

## Future Enhancements

- [ ] Add toast notifications for success/error
- [ ] Show progress bar for large file uploads
- [ ] Add document preview before publishing
- [ ] Bulk actions (process multiple, delete multiple)
- [ ] Document versioning UI
- [ ] Tag management interface
