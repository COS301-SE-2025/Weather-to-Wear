# Weather-to-Wear Capstone2 Project

## Overview

Weather-to-Wear is a full-stack application that provides personalized clothing recommendations based on real-time weather data and user wardrobe uploads. This README focuses on the **Closet Module** (image upload & fetch by category) and general setup so that team members can contribute to both backend and frontend.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Environment Variables](#environment-variables)
4. [Installation](#installation)
5. [Database Setup (Prisma)](#database-setup-prisma)
6. [Running the Application](#running-the-application)
7. [API Endpoints](#api-endpoints)
8. [Testing with Postman](#testing-with-postman)
9. [Contributing](#contributing)

---

## Prerequisites

* Node.js v18+ & npm
* Docker & Docker Compose (for local DB + containerized backend)
* (Optional) PostgreSQL client or GUI for direct DB access

---

## Project Structure

```
Weather-to-Wear-1/
├─ app-backend/              # Backend service (Express + Prisma)
│  ├─ uploads/               # Stores uploaded images (mounted volume)
│  ├─ prisma/
│  │  └─ schema.prisma       # Prisma schema
│  ├─ src/
│  │  ├─ middleware/         # Multer & other middleware
│  │  ├─ modules/
│  │  │  ├─ auth/            # Authentication routes & controllers
│  │  │  ├─ weather/         # Weather API integration
│  │  │  └─ closet/          # Closet upload & fetch module
│  │  └─ app.ts              # Express app entrypoint
│  ├─ .env                   # Backend environment variables
│  └─ package.json           # Backend dependencies & scripts
├─ docker-compose.yml        # Defines `db` (Postgres) & `backend` services
└─ uploads/                  # Mounted into backend/uploads via volume
```

---

## Environment Variables

Several `.env` files control local and production settings.

### 1. `app-backend/.env`

Create a file at `app-backend/.env` with the following variables:

```dotenv
# Express server configuration
PORT=5000

# JWT secret for authentication
JWT_SECRET=your_jwt_secret_here

# Prisma database connection
DATABASE_URL="postgresql://<user>:<password>@db:5432/weatherdb?schema=public"
```

* **PORT**: Port the Express server listens on inside the container.
* **JWT\_SECRET**: Secret key for signing JWTs in the auth module.
* **DATABASE\_URL**: Connection string pointing at the Postgres service (`db`) in Docker Compose.

### 2. Root `.env` (Optional)

If you need global overrides or production settings, you can place an `.env.prod` at the repo root and load it accordingly. For local development, `.env` under `app-backend/` is sufficient.

---

## Installation

1. **Clone the repo**

   ```bash
   git clone <repo-url>
   cd Weather-to-Wear-1
   ```

2. **Install backend dependencies**

   ```bash
   cd app-backend
   npm install
   ```

3. **Create `uploads/` directories**

   ```bash
   # At repo root:
   mkdir uploads
   # Under backend (for Docker context):
   mv uploads app-backend/uploads
   ```

---

## Database Setup (Prisma)

1. **Start services**

   ```bash
   docker-compose up -d
   ```

2. **Reset & migrate**

   ```bash
   docker-compose exec backend npx prisma migrate reset --force
   docker-compose exec backend npx prisma generate
   ```

3. (Optional) **Seed**: If you have a seed script, it will run automatically after reset.

---

## Running the Application

In **development** mode:

```bash
cd app-backend
npm run dev   # starts Express via ts-node-dev or nodemon
```

Then visit:

* **API Base URL**: `http://localhost:5000` (or `5001` if using host mapping)
* **Static Uploads**: `http://localhost:5000/uploads/<filename>`

---

## API Endpoints

### Auth Module

* `POST /api/auth/signup`
* `POST /api/auth/login`

### Weather Module

* `GET /api/weather/forecast?city=<city>`

### Closet Module (Image Upload)

* **Upload**: `POST /api/closet/upload`

  * **Body** (form-data):

    * `image` (File)
    * `category` (Text, one of `SHIRT`, `HOODIE`, `PANTS`, `SHORTS`, `SHOES`)
  * **Response**:

    ```json
    {
      "id": "<uuid>",
      "category": "SHIRT",
      "imageUrl": "/uploads/<filename>.png",
      "createdAt": "2025-...Z"
    }
    ```

* **Fetch by Category**: `GET /api/closet/category/:category`

  * **Response**: Array of items with `id`, `category`, `imageUrl`, `createdAt`.

---

## Testing with Postman

1. **Upload**: Set method to `POST`, URL `http://localhost:5000/api/closet/upload`, Body → form-data → add keys `image` (File), `category` (Text) → Send.
2. **List**: `GET http://localhost:5000/api/closet/category/SHIRT`
3. **Retrieve**: Copy `imageUrl` from response, prefix with host, and `GET` in browser or Postman.

---

## Contributing

* **Branching**: Create feature branches from `main`.
* **Linting**: Run `npm run lint` under `app-backend/`.
* **Tests**: Add unit & integration tests under each module.
* **Pull Requests**: Ensure migrations are applied and PR includes updates to this README if schema changes.

---

> This README covers the Closet Module and environment setup. For frontend integration, see the `frontend/` README (TBD).


## Making changes to a database:
docker-compose up -d
docker-compose exec backend npx prisma migrate dev --name switch_to_filename

## If the commands above give you an error, then remove any entries (for now we can do this)
docker-compose up -d
docker-compose exec backend npx prisma migrate reset --force
docker-compose exec backend npx prisma migrate dev --name switch_to_filename

# REMEMBER
- MAKE SURE!!!!! 
- Add a folder in app-backend called `uploads` and make sure it is mounted in the docker-compose.yml file
## My .env files:

### .env
PORT=5000
JWT_SECRET=supersecretkey123

# DATABASE_URL="file:./dev.db"
# DATABASE_URL="postgresql://weatheruser:weatherpass@localhost:5433/weatherdb"
# DATABASE_URL="postgresql://weatheruser:weatherpass@host.docker.internal:5433/weatherdb"
DATABASE_URL=postgresql://weatheruser:weatherpass@db:5432/weatherdb

FREE_WEATHER_API_KEY=56723eadc61d49ac8c4221508252005
FREE_WEATHER_API_URL=https://api.weatherapi.com/v1/forecast.json

OPENWEATHER_API_KEY=500b9d92598258518ecf798fab6f88c8
OPENWEATHER_API_URL=https://api.openweathermap.org/data/2.5/forecast 

### .env.prod
DATABASE_URL=postgresql://weatheruser:weatherpass@host.docker.internal:5434/weatherdb
FREE_WEATHER_API_KEY=56723eadc61d49ac8c4221508252005
FREE_WEATHER_API_URL=https://api.weatherapi.com/v1/forecast.json
OPENWEATHER_API_KEY=500b9d92598258518ecf798fab6f88c8

### .env.studio
DATABASE_URL=postgresql://weatheruser:weatherpass@localhost:5434/weatherdb


