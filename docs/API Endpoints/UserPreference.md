## **User Preferences API Endpoints**
🟡 **(Not yet implemented)**
### **1. Get My Preferences**
- **GET** `/api/preferences`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        {
          "style": "Casual",
          "preferredColours": [
            { "min": 0, "max": 20 },
            { "min": 120, "max": 180 }
          ],
          "learningWeight": 0.7,
          "updatedAt": "2025-06-09T10:00:00.000Z"
        }
        ```

### **2. Set/Update Preferences**
- **PUT** `/api/preferences`
    - **Headers:** `Authorization: Bearer <token>`
    - **Body:**
        ```json
        {
          "style": "Formal",
          "preferredColours": [
            { "min": 240, "max": 260 }
          ],
          "learningWeight": 0.8
        }
        ```
    - **Response:**  
        Updated `UserPreference` object