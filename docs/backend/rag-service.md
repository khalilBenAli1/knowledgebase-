# RAG Service Documentation

## Overview

The RAG (Retrieval-Augmented Generation) Service is responsible for semantic search over document chunks using vector similarity and providing context for the LLM to generate answers.

**Location:** `src/modules/rag/rag.service.ts`

## Dependencies

- **DocumentChunk Repository:** Access to document chunks with embeddings
- **Document Repository:** Access to document metadata
- **LLMService:** For generating embeddings of user queries
- **ConfigService:** For configuration parameters

## Key Methods

### `searchSimilarChunks(query: string, topK: number): Promise<SearchResult[]>`

Searches for document chunks most semantically similar to the user's query.

**Parameters:**
- `query`: The user's question or search query
- `topK`: Number of top results to return (default: 5)

**Returns:**
Array of SearchResult objects containing:
- `chunk`: The DocumentChunk entity
- `document`: Associated Document entity
- `similarity`: Similarity score (0-1)

**Process:**
1. Generate embedding vector for the query using LLM
2. Use PostgreSQL pgvector to find chunks with similar embeddings
3. Filter by document status (only `published` documents)
4. Order by vector similarity using `<=>` operator
5. Limit results to topK

**Configuration:**
- `SIMILARITY_THRESHOLD`: Minimum similarity score (default: 0.7)
- `TOP_K_RESULTS`: Default number of results (default: 5)

---

### `retrieveContext(query: string): Promise<RetrievalResult>`

Retrieves relevant context and source references for answering a query.

**Parameters:**
- `query`: User's question

**Returns:**
RetrievalResult object containing:
- `context`: Array of chunk texts to provide to the LLM
- `sources`: Array of source metadata for citations

**Example Response:**
```typescript
{
  context: [
    "Article 15: Les employés ont droit à 30 jours de congé...",
    "Section 3.2: Les congés doivent être demandés..."
  ],
  sources: [
    {
      documentId: "uuid",
      documentName: "Règlement Intérieur",
      page: 12,
      article: "Article 15",
      heading: "Congés annuels",
      chunkId: "uuid"
    }
  ]
}
```

---

## Vector Similarity

The service uses PostgreSQL's pgvector extension for efficient similarity search:

- **Vector Column:** `embedding` (type: vector)
- **Similarity Operator:** `<=>` (cosine distance)
- **Index:** GiST or HNSW index on embedding column (recommended for production)

---

## Usage Example

```typescript
// In ChatService
const { context, sources } = await this.ragService.retrieveContext(userQuestion);
const answer = await this.llmService.generateAnswer(userQuestion, context);
// Return answer with sources for citations
```

---

## Performance Considerations

- **Embedding Generation:** ~100-500ms per query
- **Vector Search:** ~10-50ms with proper indexing
- **Total Latency:** ~200-1000ms depending on topK and chunk count

---

## Future Enhancements

- Implement hybrid search (vector + keyword)
- Add re-ranking of results
- Support for multi-document queries
- Caching of frequently asked questions
