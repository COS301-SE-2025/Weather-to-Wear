# Auth API Documentation

This document outlines the authentication system for the **Weather-to-Wear** backend.

---

## Endpoints

### 1. **POST** `/api/auth/signup`
Create a new user account.

#### Request Body (JSON)
```json
{
  "name": "Kyle",
  "email": "kyle@example.com",
  "password": "capstone123"
}
```

#### Response
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "uuid",
    "name": "Kyle",
    "email": "kyle@example.com"
  }
}
```

### 2. **POST** `/api/auth/login`
Authenticate an existing user and receive a JWT token.

#### Request Body (JSON)
```json
{
  "email": "kyle@example.com",
  "password": "capstone123"
}
```

#### Response
```json
{
  "message": "Login successful",
  "token": "<jwt_token>",
  "user": {
    "id": "uuid",
    "name": "Kyle",
    "email": "kyle@example.com"
  }
}
```

### 3. **GET** `/api/auth/profile`
Access a protected route using a valid token.

#### Request Headers
```
Authorization: Bearer <jwt_token>
```

#### Response
```json
{
  "message": "You are authenticated!",
  "user": {
    "id": "uuid",
    "email": "kyle@example.com"
  }
}
```

---

## Authentication
Protected routes require a valid JWT token passed in the Authorization header:
```
Authorization: Bearer <token>
```
JWT tokens are valid for 1 hour by default.

---

## Environment Variables
The following are required in .env:
```
JWT_SECRET=your_super_secret_key
PORT=5000
```

---

## Running the auth system 
To run the program locally and without docker
```
npx ts-node src/server.ts

```
And to view the SQLite DB
```
npx prisma studio
```

---

## Tests 
Tests are written with Jest and Supertest. Run them via:
```
npm test
```

---

## Docker 
You can run the backend using Docker:
```
docker build -t weather-backend .
docker run -p 5000:5000 weather-backend
```
If the port has already been allocated for some reason, then:
```
docker run -p 5001:5000 weather-backend
```

---

