## **Event API Endpoints**
🟡 **(Not yet implemented)**
### **1. Get All My Events**
- **GET** `/api/events`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        [
          {
            "id": "<event_id>",
            "location": "Cape Town",
            "weather": "{\"temperature\": 18, \"condition\": \"Cloudy\"}",
            "dateFrom": "2025-06-12T12:00:00.000Z",
            "dateTo": "2025-06-12T14:00:00.000Z",
            "style": "Formal"
          }
          // ...
        ]
        ```

### **2. Add Event**
- **POST** `/api/events`
    - **Headers:** `Authorization: Bearer <token>`
    - **Body:**
        ```json
        {
          "location": "Cape Town",
          "weather": "{\"temperature\": 18, \"condition\": \"Cloudy\"}",
          "dateFrom": "2025-06-12T12:00:00.000Z",
          "dateTo": "2025-06-12T14:00:00.000Z",
          "style": "Formal"
        }
        ```
    - **Response:**  
        New `Event` object

### **3. Edit Event**
- **PUT** `/api/events/:id`
    - **Headers:** `Authorization: Bearer <token>`
    - **Body:** (any updatable field)
        ```json
        { "location": "Stellenbosch", "style": "Casual" }
        ```
    - **Response:**  
        Updated `Event` object

### **4. Delete Event**
- **DELETE** `/api/events/:id`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        { "success": true }
        ```

### **5. Get Single Event**
- **GET** `/api/events/:id`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**  
        Event object