## **Closet API Endpoints**
> **General:**
> - All endpoints require authentication (`Authorization: Bearer <token>`).
> - Image files are stored locally; responses return the `imageUrl` as `/uploads/<filename>`.

---
### **1. Upload Closet Item (Single Image)**
- **POST** `/api/closet/upload`  
    **Status:** 🟢 _Implemented_
    - **Headers:**
        - `Authorization: Bearer <token>`
        - `Content-Type: multipart/form-data`
    - **Body:** (form-data)
        - `image`: image file (required)
        - `category`: string (required, must match `Category` enum, e.g., `"SHOES"`)
    - **Response:**
        ```json
        {
          "id": "<closet_item_id>",
          "category": "SHOES",
          "imageUrl": "/uploads/img.png",
          "createdAt": "2025-05-27T00:00:00.000Z"
        }
        ```
    - **Errors:**
        - `400 Bad Request`: If no file or category provided, or invalid category.
        - `401 Unauthorized`: If no or invalid token.

---
### **2. Upload Closet Items (Batch)**
- **POST** `/api/closet/upload/batch`  
    **Status:** 🟢 _Implemented_
    - **Headers:**
        - `Authorization: Bearer <token>`
        - `Content-Type: multipart/form-data`
    - **Body:** (form-data)
        - `images`: multiple image files (required)
        - `category`: string (required, applies to all images in this batch)
    - **Response:**
        ```json
        [
          {
            "id": "<closet_item_id>",
            "category": "SHOES",
            "imageUrl": "/uploads/img1.png",
            "createdAt": "2025-05-27T00:00:00.000Z"
          },
          {
            "id": "<closet_item_id>",
            "category": "SHOES",
            "imageUrl": "/uploads/img2.png",
            "createdAt": "2025-05-27T00:00:00.000Z"
          }
        ]
        ```
    - **Errors:**
        - `400 Bad Request`: If no files, no category, or invalid category.
        - `401 Unauthorized`: If no or invalid token.

---
### **3. Get Closet Items by Category**
- **GET** `/api/closet/category/:category`  
    **Status:** 🟢 _Implemented_
    - **Headers:**
        - `Authorization: Bearer <token>`
    - **Params:**
        - `category`: string (required, must match a `Category` enum value, e.g., `"SHOES"`)
    - **Response:**
        ```json
        [
          {
            "id": "<closet_item_id>",
            "category": "SHOES",
            "imageUrl": "/uploads/img.png",
            "createdAt": "2025-05-27T00:00:00.000Z"
          }
          // ...
        ]
        ```
    - **Errors:**
        - `401 Unauthorized`: If no or invalid token.

---
### **4. Get All Closet Items**
- **GET** `/api/closet/all`  
    **Status:** 🟢 _Implemented_
    - **Headers:**
        - `Authorization: Bearer <token>`
    - **Response:**
        ```json
        [
          {
            "id": "<closet_item_id>",
            "category": "SHOES",
            "imageUrl": "/uploads/img.png",
            "createdAt": "2025-05-27T00:00:00.000Z"
          }
          // ...
        ]
        ```
    - **Notes:**
        - Returns **all closet items for the authenticated user** (regardless of category).
    - **Errors:**
        - `401 Unauthorized`: If no or invalid token.

---
### **5. Get Closet Item by ID** 🟡
- **GET** `/api/closet/:id`  
    **Status:** 🟡 _Not yet implemented_
    - **Purpose:** Retrieve a specific closet item by its unique ID.
    - **Recommended Response:**
        ```json
        {
          "id": "<closet_item_id>",
          "category": "SHOES",
          "imageUrl": "/uploads/img.png",
          "createdAt": "2025-05-27T00:00:00.000Z"
        }
        ```

---
### **6. Edit Closet Item** 🟡
- **PUT** `/api/closet/:id`  
    **Status:** 🟡 _Not yet implemented_
    - **Purpose:** Edit a closet item’s metadata (category, image, etc).
    - **Recommended Body:**
        ```json
        {
          "category": "SHOES"
          // additional editable fields
        }
        ```
    - **Recommended Response:**
        ```json
        {
          "id": "<closet_item_id>",
          "category": "SHOES",
          "imageUrl": "/uploads/img.png",
          "createdAt": "2025-05-27T00:00:00.000Z"
        }
        ```

---
### **7. Delete Closet Item** 🟡
- **DELETE** `/api/closet/:id`  
    **Status:** 🟡 _Not yet implemented_
    - **Purpose:** Delete a closet item by its unique ID.
    - **Recommended Response:**
        ```json
        { "success": true }
        ```

---
## **Summary Table**

|Method|Endpoint|Status|Purpose/Notes|
|---|---|---|---|
|POST|`/api/closet/upload`|🟢 Implemented|Upload a single closet item image|
|POST|`/api/closet/upload/batch`|🟢 Implemented|Upload multiple images at once|
|GET|`/api/closet/category/:category`|🟢 Implemented|Get all items in a category|
|GET|`/api/closet/all`|🟢 Implemented|Get all closet items|
|GET|`/api/closet/:id`|🟡 Not yet|Get closet item by ID|
|PUT|`/api/closet/:id`|🟡 Not yet|Edit closet item|
|DELETE|`/api/closet/:id`|🟡 Not yet|Delete closet item|

---
### **General Notes**
- All endpoints require authentication.
- Categories must match the `Category` enum as defined in your backend.
- **Not implemented yet:** get by ID, edit, and delete item endpoints.
- All responses are `application/json`.
- Errors return descriptive messages and appropriate HTTP status codes.

---
