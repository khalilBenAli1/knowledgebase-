# Authentication API

## Overview

The Authentication module handles user login, JWT token generation, and user session management.

## Endpoints

### POST /api/auth/login

Authenticates a user and returns a JWT access token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "role": {
      "id": "uuid",
      "name": "User"
    }
  }
}
```

**Errors:**
- 401 Unauthorized: Invalid credentials
- 401 Unauthorized: User account is disabled

---

### GET /api/auth/me

Returns the currently authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "id": "uuid",
  "name": "User Name",
  "email": "user@example.com",
  "role": {
    "id": "uuid",
    "name": "User"
  }
}
```

**Errors:**
- 401 Unauthorized: Invalid or missing token

---

## Security

- Passwords are hashed using bcrypt with salt rounds of 10
- JWT tokens expire based on JWT_EXPIRES_IN environment variable (default: 3600 seconds)
- All login attempts are logged in the audit system
