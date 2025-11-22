# Formations API

These endpoints expose the training (formations) catalogue helpers used by the assistant.

## `GET /api/formations/cards`

Returns a curated list of published documents tagged as formations so the UI (or the chatbot) can render training cards.

**Query parameters**

| Name | Type | Description |
|------|------|-------------|
| `limit` | number (optional) | Maximum number of cards to return (default: 4) |

**Response**

```json
{
  "cards": [
    {
      "id": "uuid",
      "title": "Formation Gestion de Projet",
      "department": "RH",
      "tags": ["formation", "management"],
      "category": "formation",
      "updatedAt": "2024-05-09T11:42:00.000Z"
    }
  ]
}
```

## `POST /api/formations/catalogue/query`

Lets you send OCR text (or reference an already uploaded document) to the LLM and obtain an answer limited to that training catalogue.

**Request body**

```json
{
  "question": "Quelles formations couvrent la cybersécurité ?",
  "documentId": "uuid-of-formation-document",
  "ocrText": "… optional raw text …",
  "topK": 5
}
```

- Provide either `documentId` (to reuse stored chunks/OCR text) or `ocrText` (raw text straight from your local OCR step).
- `topK` defaults to 5 so the LLM only sees the most relevant chunks.

**Response**

```json
{
  "answer": "… réponse en français …",
  "contextCount": 5,
  "contextPreviews": [
    {
      "chunkId": "uuid-or-generated",
      "similarity": 0.81,
      "preview": "Passage du catalogue…"
    }
  ]
}
```

Use this endpoint after you OCR a PDF locally: save the extracted text, send it as `ocrText`, and the assistant reuses the same guardrails (French tone, compliance focus) without needing to persist the document in the main knowledge base.
