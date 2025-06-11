## **Outfit API Endpoints**
🟡 **(Not yet implemented)**
### **1. Get All My Outfits**
- **GET** `/api/outfits`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        [
          {
            "id": "<outfit_id>",
            "createdAt": "2025-06-09T10:00:00.000Z",
            "warmthRating": 6,
            "waterproof": false,
            "overallStyle": "Casual",
            "userRating": 4,
            "outfitItems": [
              // see Outfit Items endpoint
            ],
            "weatherSummary": "{\"temperature\": 18, \"condition\": \"Cloudy\"}"
          }
          // ...
        ]
        ```

### **2. Get Single Outfit**
- **GET** `/api/outfits/:id`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        {
          "id": "<outfit_id>",
          "createdAt": "2025-06-09T10:00:00.000Z",
          "warmthRating": 6,
          "waterproof": false,
          "overallStyle": "Casual",
          "userRating": 4,
          "outfitItems": [
            // see Outfit Items endpoint
          ],
          "weatherSummary": "{\"temperature\": 18, \"condition\": \"Cloudy\"}"
        }
        ```

### **3. Generate/Add Outfit**
- **POST** `/api/outfits`
    - **Headers:** `Authorization: Bearer <token>`
    - **Body (manual):**
        ```json
        {
          "outfitItems": [
            { "closetItemId": "itemid1", "layerCategory": "base_top", "sortOrder": 0 },
            { "closetItemId": "itemid2", "layerCategory": "base_bottom", "sortOrder": 0 }
          ],
          "weatherSummary": "{\"temperature\": 18, \"condition\": \"Cloudy\"}",
          "overallStyle": "Casual"
        }
        ```
    - **Body (auto-generation):**
        ```json
        {
          "eventId": "eventid1",
          "weatherSummary": "{\"temperature\": 18, \"condition\": \"Cloudy\"}",
          "style": "Formal",
          "preferences": { /* ... */ }
        }
        ```
    - **Response:**  
        Same as **Get Single Outfit**

### **4. Edit Outfit**
- **PUT** `/api/outfits/:id`
    - **Headers:** `Authorization: Bearer <token>`
    - **Body:**
        ```json
        {
          "userRating": 5,
          "outfitItems": [
            { "closetItemId": "itemid1", "layerCategory": "base_top", "sortOrder": 0 }
          ],
          "overallStyle": "Formal"
        }
        ```
    - **Response:**  
        Updated outfit object

### **5. Delete Outfit**
- **DELETE** `/api/outfits/:id`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        { "success": true }
        ```
