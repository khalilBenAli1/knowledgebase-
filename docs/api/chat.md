# Chat API

## Overview

The Chat API enables users to interact with the AI assistant, ask questions about internal regulations, and receive answers with source citations.

## Endpoints

### POST /api/chat

Sends a question to the AI assistant and receives an answer with source references.

**Role Required:** User (any authenticated user)

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "question": "Quel est le nombre de jours de congé annuel?",
  "sessionId": "optional-uuid-of-existing-session"
}
```

**Response:**
```json
{
  "sessionId": "uuid",
  "message": {
    "id": "uuid",
    "sessionId": "uuid",
    "role": "assistant",
    "content": "Selon l'article 15 du règlement intérieur...",
    "sourceRefs": [
      {
        "documentId": "uuid",
        "documentName": "Règlement Intérieur",
        "page": 12,
        "article": "Article 15",
        "heading": "Congés et absences",
        "chunkId": "uuid"
      }
    ],
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Process:**
1. If no sessionId is provided, a new chat session is created
2. The user's question is saved as a message
3. The RAG service retrieves relevant document chunks
4. The LLM generates an answer based on the retrieved context
5. The assistant's response with sources is saved and returned
6. The interaction is logged in the audit system

---

### GET /api/chat/sessions

Returns all chat sessions for the current user.

**Role Required:** User

**Response:**
```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "title": "Question about vacation days",
    "startedAt": "2024-01-15T10:30:00Z",
    "isActive": true
  }
]
```

---

### GET /api/chat/sessions/:id/messages

Returns all messages in a specific chat session.

**Role Required:** User

**Response:**
```json
[
  {
    "id": "uuid",
    "sessionId": "uuid",
    "role": "user",
    "content": "Question...",
    "sourceRefs": [],
    "createdAt": "2024-01-15T10:30:00Z"
  },
  {
    "id": "uuid",
    "sessionId": "uuid",
    "role": "assistant",
    "content": "Answer...",
    "sourceRefs": [...],
    "createdAt": "2024-01-15T10:30:15Z"
  }
]
```

---

## Important Notes

- All answers must come from published documents only
- Sources are always included in the response
- If no relevant information is found, the assistant will suggest contacting HR
- Chat queries are audited for compliance tracking
