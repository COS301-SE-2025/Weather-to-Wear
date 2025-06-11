## **Outfit Item API Endpoints**
🟡 **(Not yet implemented)**
> OutfitItems are usually managed as part of the `/api/outfits` endpoints, but can also be managed individually if needed.
### **1. Get Items for an Outfit**
- **GET** `/api/outfits/:id/items`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        [
          {
            "id": "<outfit_item_id>",
            "closetItemId": "itemid1",
            "layerCategory": "base_top",
            "sortOrder": 0
          }
          // ...
        ]
        ```

### **2. Add Item to Outfit**
- **POST** `/api/outfits/:id/items`
    - **Headers:** `Authorization: Bearer <token>`
    - **Body:**
        ```json
        { "closetItemId": "itemid1", "layerCategory": "base_top", "sortOrder": 0 }
        ```
    - **Response:**  
        New `OutfitItem` object

### **3. Remove Item from Outfit**
- **DELETE** `/api/outfits/:id/items/:itemId`
    - **Headers:** `Authorization: Bearer <token>`
    - **Response:**
        ```json
        { "success": true }
        ```