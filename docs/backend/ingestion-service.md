# Ingestion Service Documentation

## Overview

The Ingestion Service handles the complete pipeline of processing uploaded documents: parsing, chunking, embedding, and indexing into the vector database.

**Location:** `src/modules/ingestion/ingestion.service.ts`

## Dependencies

- **DocumentsService:** For document metadata management
- **ParserService:** For extracting text from PDF and DOCX files
- **LLMService:** For generating embeddings
- **DocumentChunk Repository:** For storing chunks with embeddings

## Key Methods

### `processDocument(documentId: string): Promise<void>`

Main entry point for document processing pipeline.

**Parameters:**
- `documentId`: UUID of the document to process

**Process:**
1. Fetch document metadata from database
2. Parse file (PDF or DOCX) to extract text
3. Split text into overlapping chunks
4. Generate embeddings for each chunk
5. Store chunks with embeddings in database
6. Update document status to `parsed`

**Configuration:**
- `CHUNK_SIZE`: Characters per chunk (default: 800)
- `CHUNK_OVERLAP`: Overlapping characters between chunks (default: 150)

**Status Transitions:**
```
uploaded → parsed
```

**Example:**
```typescript
await ingestionService.processDocument('document-uuid');
```

---

### `reindexDocument(documentId: string): Promise<void>`

Re-processes an existing document (useful after model changes or updates).

**Process:**
1. Delete existing chunks for the document
2. Run full processing pipeline again

**Use Cases:**
- Embedding model was updated
- Document was modified
- Chunking strategy changed

---

### `getProcessingStatus(documentId: string): Promise<ProcessingStatus>`

Returns current processing status and chunk count.

**Returns:**
```typescript
{
  documentId: "uuid",
  status: "parsed",
  chunkCount: 47
}
```

---

## Chunking Strategy

The service uses a sliding window approach with overlap:

- **Window Size:** 800 characters (configurable)
- **Overlap:** 150 characters (configurable)
- **Method:** Sentence-based splitting to avoid breaking mid-sentence

**Why Overlap?**
- Ensures important information isn't lost at chunk boundaries
- Improves retrieval quality for context that spans multiple sentences

**Example:**
```
Chunk 1: [sentences 1-5] (800 chars)
Chunk 2: [sentences 4-8] (800 chars, overlaps with chunk 1)
```

---

## Document Parsing

### Supported Formats

#### PDF (.pdf)
- **Library:** `pdf-parse` (open source, no API key required)
- **Extracts:** Text content, page numbers, metadata
- **Limitations:** OCR not included (scanned PDFs won't work)

#### DOCX (.docx)
- **Library:** `mammoth` (open source)
- **Extracts:** Raw text, preserves structure
- **Limitations:** Some complex formatting may be lost

---

## Embedding Generation

Each chunk is converted to a vector embedding:

- **Model:** Configured via `EMBEDDING_MODEL` env variable
- **Dimension:** Depends on model (typically 384 or 768)
- **Storage:** PostgreSQL with pgvector extension

**Performance:**
- ~100-200ms per chunk for embedding generation
- For a 50-page document: ~2-5 minutes total processing time

---

## Error Handling

If processing fails:
- Document status remains `uploaded`
- Error is logged
- No partial chunks are saved (transactional)

Retry by calling `processDocument` again.

---

## API Integration

### Process Document (HR Admin)
```bash
POST /api/ingestion/process/:id
```

### Reindex Document (IT Admin)
```bash
POST /api/ingestion/reindex/:id
```

### Check Status
```bash
GET /api/ingestion/status/:id
```

---

## Best Practices

1. **Process documents asynchronously:** Large documents can take minutes
2. **Monitor chunk count:** Very large chunk counts may indicate oversized documents
3. **Test chunking parameters:** Different document types may benefit from different sizes
4. **Use background jobs:** Consider implementing a queue for production

---

## Related Services

- **ParserService:** Low-level file parsing
- **DocumentsService:** Document lifecycle management
- **LLMService:** Embedding generation
- **RAGService:** Consumes the indexed chunks for search
