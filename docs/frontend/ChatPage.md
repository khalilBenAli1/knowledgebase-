# ChatPage Component

## Overview

The main chat interface where users interact with the AI assistant. Displays conversation history, handles message input, and shows source citations.

**Location:** `frontend/src/pages/ChatPage.tsx`

## Features

- **Session Management:** View past conversations and start new ones
- **Real-time Chat:** Send questions and receive AI-generated answers
- **Source Citations:** Display documents and sections used to generate answers
- **Auto-scroll:** Automatically scrolls to newest message
- **Responsive Layout:** Three-column layout (sessions, chat, sources)

## Props

None - this is a page component that uses routing.

## State Management

### Local State
- `sessions`: List of user's chat sessions
- `currentSessionId`: Active session ID
- `messages`: Messages in current session
- `input`: Current input text
- `loading`: Loading state during API calls
- `selectedSources`: Sources for last assistant message

## Layout

```
┌─────────────┬──────────────────────┬──────────────┐
│  Sessions   │    Chat Messages     │   Sources    │
│  Sidebar    │                      │   Panel      │
│             │                      │              │
│ - New Chat  │  [User Message]      │ Document 1   │
│ - Session 1 │  [AI Response]       │  - Page 12   │
│ - Session 2 │  [User Message]      │  - Article 5 │
│             │  [AI Response]       │              │
│             │                      │ Document 2   │
│             │  [Input Field]       │  - Page 8    │
└─────────────┴──────────────────────┴──────────────┘
```

## API Calls

### `loadSessions()`
- **Endpoint:** GET /api/chat/sessions
- **Purpose:** Load user's chat history
- **Called:** On component mount

### `loadMessages(sessionId)`
- **Endpoint:** GET /api/chat/sessions/:id/messages
- **Purpose:** Load messages for selected session
- **Called:** When currentSessionId changes

### `handleSendMessage()`
- **Endpoint:** POST /api/chat
- **Payload:**
  ```json
  {
    "question": "user input",
    "sessionId": "optional-uuid"
  }
  ```
- **Purpose:** Send question and receive answer
- **Called:** On form submit

## User Interactions

1. **Sending a Message:**
   - User types question in input field
   - Presses Enter or clicks "Envoyer"
   - Message appears immediately (optimistic update)
   - Loading indicator shown
   - AI response appears with sources
   - Sources panel updates

2. **Starting New Chat:**
   - Click "Nouvelle conversation"
   - Clears current session
   - Resets messages and sources

3. **Viewing Past Conversation:**
   - Click session in sidebar
   - Loads all messages for that session
   - Updates sources to last assistant message

## Components Used

- **ChatMessage:** Renders individual messages with feedback buttons
- **SourcesList:** Displays source citations in right panel

## Styling

- Uses Tailwind CSS for layout and styling
- Blue theme matching Assurances BIAT branding
- Responsive design (collapses on mobile)

## Accessibility

- Semantic HTML structure
- Form labels for screen readers
- Keyboard navigation support
- Auto-scroll to newest content

## Example Usage

This is a page component accessed via routing:

```tsx
// In App.tsx
<Route index element={<ChatPage />} />
```

## Related Files

- `components/ChatMessage.tsx` - Message rendering
- `components/SourcesList.tsx` - Source display
- `services/api.ts` - API client
- `store/authStore.ts` - User authentication

## Future Enhancements

- [ ] Add typing indicator
- [ ] Support file attachments in questions
- [ ] Add search within conversations
- [ ] Export conversation as PDF
- [ ] Add conversation sharing (for admins)
