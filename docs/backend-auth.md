
# Auth API Documentation

This document outlines the authentication system for the **Weather-to-Wear** backend.

---

## Features

- User Signup (with password hashing)
- User Login (with JWT issuance)
- JWT-protected profile route
- PostgreSQL integration via Prisma ORM
- Dockerized for local and CI use
- Fully tested with Jest + Supertest

---

## File Structure 
app-backend/
├── src/
│ ├── app.ts # Main express app
│ ├── server.ts # Entry point
│ └── modules/
│ └── auth/
│ ├── auth.routes.ts
│ ├── auth.controller.ts
│ ├── auth.service.ts
│ ├── auth.middleware.ts
│ └── auth.utils.ts
├── prisma/
│ ├── schema.prisma # Prisma schema
│ ├── migrations/ # Prisma migrations
├── tests/
│ └── auth.test.ts # Jest + Supertest auth tests
├── Dockerfile # Docker config
├── .env # Contains DATABASE_URL, JWT_SECRET

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

## Auth Logic 
- Passwords are hashed using bcrypt
- JWTs are signed using JWT_SECRET (from .env)
- Middleware authenticateToken() verifies tokens and sets req.user

---

## Environment Variables
The following are required in .env:
```env
PORT=5001
JWT_SECRET=supersecretkey123
DATABASE_URL="postgresql://weatheruser:weatherpass@localhost:5433/weatherdb"
```
You can override DATABASE_URL at runtime in Docker with -e.

---

## Prisma Commands
```
npx prisma migrate dev --name init
npx prisma studio
npx prisma generate
```

NOTE: For prototyping purposes, "npx dotenv -e .env.studio -- prisma db push" will be run in the terminal to create the database and tables without migrations. This is useful for quick iterations during development. ( Reason being that the migrations were giving errors.)

NOTE: `npx prisma generate` in `app-backend` must be ran before any running the subsystem locally or using any testing.

---

## Running the auth system 
Remember to run `npx prisma generate` in `app-backend` before running locally, if it is your first time running locally.
To run the program locally and without docker
```
npx ts-node src/server.ts

```
And to view the DB
```
npx prisma studio
```

---

## Tests 
Remember to run `npx prisma generate` in `app-backend` before testing if it is your first time testing.
Tests are written with Jest and Supertest. Run them via:
```
npm test
```
The tests:
- Reset the database (prisma migrate reset)
- Test all auth flows: signup, login, and protected route

---

## Docker 
You can run the backend using Docker. Run these commands within the app-backend folder.
To build:
```bash
docker build -t weather-backend .
```
To run:
```bash
docker run -p 5000:5000 -e DATABASE_URL="postgresql://weatheruser:weatherpass@host.docker.internal:5433/weatherdb" weather-backend
```
If the port has already been allocated for some reason, then:
```bash
docker run -p 5001:5000 -e DATABASE_URL="postgresql://weatheruser:weatherpass@host.docker.internal:5433/weatherdb" weather-backend
```

- Use host.docker.internal to connect from container ➜ host Postgres (on Windows/Mac).

---

## Developer Tips 
- Always run Prisma commands from app-backend/
- Make sure .env is correctly scoped when building/running Docker
- Never commit .env or actual .db files
