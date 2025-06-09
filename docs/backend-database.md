# Database Documentation 

## Overview
- Database tables include:
  - Users 
  - ClosetItem 
  - Outfit
  - OutfitItem 
  - Event 
  - UserPreference
- The schema can be found in `app-backend/prisma/schema.prisma`
- Endpoint configuration and code logic should be done in their respective `app-backend/src/modules/<nameOfSubsystem>` folder
- Subsystems include:
  - auth
  - `closet`
  - `weather`
  - `outfits`
  - `outfitItems`
  - `userPreferences`
  - `events`

---

## **API Endpoint Documentation**

### **Authentication**

* Most endpoints (except `signup` and `login`) require a valid JWT in the `Authorization: Bearer <token>` header.
* All user-specific routes use the authenticated user’s ID from the JWT.

---

### **1. Users**

#### **Signup**

* **POST** `/api/auth/signup`

  * **Body:** `{ name, email, password }`
  * **Response:** `{ user, token }`
* **Notes:** Creates user, returns JWT.

#### **Login**

* **POST** `/api/auth/login`

  * **Body:** `{ email, password }`
  * **Response:** `{ user, token }`

#### **Get My Profile**

* **GET** `/api/users/me`

  * **Response:** `{ id, name, email, ... }`

---

### **2. Closet Items**

#### **Get All My Closet Items**

* **GET** `/api/closet`

  * **Response:** `[{ id, layer, type, filename, colorHex, warmthFactor, waterproof, style, material, createdAt }, ...]`

#### **Add Closet Item**

* **POST** `/api/closet`

  * **Multipart Body:**

    * image file
    * fields: `layer`, `type`, `colorHex`, `warmthFactor`, `waterproof`, `style`, `material`
  * **Response:** New `ClosetItem` object.

#### **Edit Closet Item**

* **PUT** `/api/closet/:id`

  * **Body:** Any updatable fields, e.g. `{ colorHex, warmthFactor, waterproof, style, material }`
  * **Response:** Updated `ClosetItem`.

#### **Delete Closet Item**

* **DELETE** `/api/closet/:id`

  * **Response:** `{ success: true }`

#### **Get Single Closet Item**

* **GET** `/api/closet/:id`

  * **Response:** `ClosetItem` object.

---

### **3. Outfits**

#### **Get All My Outfits**

* **GET** `/api/outfits`

  * **Response:** `[{ id, createdAt, warmthRating, waterproof, overallStyle, userRating, outfitItems, weatherSummary }, ...]`

#### **Generate (or Add) Outfit**

* **POST** `/api/outfits`

  * **Body:**

    * For **manual** add:
      `{ outfitItems: [closetItemId, ...], weatherSummary, overallStyle }`
    * For **auto-generation**:
      `{ eventId?, weatherSummary?, style?, preferences? }`
      (Backend can generate based on user, weather, event.)
  * **Response:** New `Outfit` object.

#### **Edit Outfit**

* **PUT** `/api/outfits/:id`

  * **Body:** Editable fields: `{ userRating, outfitItems, overallStyle }`
  * **Response:** Updated `Outfit`.

#### **Delete Outfit**

* **DELETE** `/api/outfits/:id`

  * **Response:** `{ success: true }`

#### **Get Single Outfit**

* **GET** `/api/outfits/:id`

  * **Response:** Outfit with details, including nested `outfitItems` and their associated `closetItem` info.

---

### **4. Outfit Items**

* **Note:** These are typically managed as part of `Outfit` creation/edit, but for completeness:

#### **Get Items for an Outfit**

* **GET** `/api/outfits/:id/items`

  * **Response:** `[OutfitItem]`

#### **Add Item to Outfit**

* **POST** `/api/outfits/:id/items`

  * **Body:** `{ closetItemId, layerCategory, sortOrder }`
  * **Response:** New `OutfitItem`.

#### **Remove Item from Outfit**

* **DELETE** `/api/outfits/:id/items/:itemId`

  * **Response:** `{ success: true }`

---

### **5. User Preferences**

#### **Get My Preferences**

* **GET** `/api/preferences`

  * **Response:** `UserPreference` object.

#### **Set/Update Preferences**

* **PUT** `/api/preferences`

  * **Body:** `{ style, preferredColours, learningWeight }`
  * **Response:** Updated `UserPreference`.

---

### **6. Events (Calendar/Planner)**

#### **Get All My Events**

* **GET** `/api/events`

  * **Response:** `[Event]`

#### **Add Event**

* **POST** `/api/events`

  * **Body:** `{ location, weather (JSON/string), dateFrom, dateTo, style }`
  * **Response:** New `Event` object.

#### **Edit Event**

* **PUT** `/api/events/:id`

  * **Body:** Editable fields.
  * **Response:** Updated `Event`.

#### **Delete Event**

* **DELETE** `/api/events/:id`

  * **Response:** `{ success: true }`

#### **Get Single Event**

* **GET** `/api/events/:id`

  * **Response:** `Event` object.

---

### **7. Weather (Forecast & Snapshots)**

* **GET** `/api/weather?lat=<>&lon=<>`

  * **Response:** `{ temperature, windSpeed, condition, humidity, ... }`

* Used by frontend and/or backend when generating/saving outfits or events.

---

### **General Notes and Conventions**

* All responses are `application/json`.
* Authentication errors return HTTP 401/403.
* If the requested resource does not belong to the authenticated user, return HTTP 403.
* Validation errors return HTTP 400 with details.
* All date/times are in ISO 8601 format (UTC or specify time zone).

---

### **Example: Closet Item Add Request**

**POST** `/api/closet`
(Form-data/multipart)

| Key          | Value (example) |
| ------------ | --------------- |
| image        | (image file)    |
| layer        | "base\_top"     |
| type         | "TShirt"        |
| colorHex     | "#FF5733"       |
| warmthFactor | 3               |
| waterproof   | false           |
| style        | "Casual"        |
| material     | "Cotton"        |

---


## Restarting the database
Note that the notorious tweaking of the web-app which occurred after `docker-compose down -v` has been fixed. Here's how:
- Added `- ./app-backend/prisma:/app/prisma` to docker-compose.yml 
- Changed apk line in Dockerfile to `RUN apk add --no-cache curl postgresql-client` -> not sure if this contributed to the fixing of the problem. 
- Deleted all **folders** (not the `.toml`) in the `app-backend/prisma/migrations/` 
- Ran the following in the terminal:
    - `docker-compose down -v` -> Delete the DB volume
    - `docker-compose up -d db` -> Start just the DB
    - Run migration dev to create ALL migrations from the current schema:
        - docker-compose run --rm backend sh
        - npx prisma migrate dev --name init
        - exit
    - `docker-compose down -v`
    - `docker-compose up --build` 
The migration folders should be regenerated and everything should be working. 

## Current Downfalls 
1. Database is not being hosted. Only locally persistent. 
2. Not all tables have proper CRUD endpoints exposed