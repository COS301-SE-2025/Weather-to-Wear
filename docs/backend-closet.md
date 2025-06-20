## Guidelines and examples on how to run the backend using postman
### NOTE: 
- Before starting, you need to make sure that you have logged in with a user such that you are able to take and copy the auth token, to do soo, put it under authorization in the header as `Bearer <token>`.


### Getting all the items in your closet:  
  - **GET** 
  - http://localhost:5001/api/closet/all
  - This will return all items in your closet.

### Adding a new item to your closet:
- POST http://localhost:5000/api/closet/upload
- Authorization: Bearer <your-token>
- Content-Type: multipart/form-data

    Form Data:
    - image: [select file]
    - category: "SHIRT"
    - colorHex: "#FF0000"
    - warmthFactor: 3
    - waterproof: true
    - style: "CASUAL"
    - material: "COTTON"

### Uploading in batch ( not sure how or when this would be used, but it is available):
- POST http://localhost:5000/api/closet/upload/batch
- Authorization: Bearer <your-token>
- Content-Type: multipart/form-data

    Form Data:
    - images: [select multiple files]
    - category: "TOPS"
    - colorHex: "#FF0000"
    - warmthFactor: 3
    - waterproof: true
    - style: "CASUAL"
    - material: "COTTON"

### Fetching items by category:
- GET http://localhost:5000/api/closet/category/TOPS
- Authorization: Bearer <your-token>

### Deleting an item from your closet:
- DELETE http://localhost:5000/api/closet/:imageId
- Authorization: Bearer <your-token>
- NOTE: The imageId is the ID you'll recieve when you first upload the image.

### updating an item in your closet:
- PATCH http://localhost:5000/api/closet/:id
- Authorization: Bearer <your-token>
- Content-Type: application/json

    - RAW data:
    {
        "category": "SHORTS",
        "colorHex": "#00FF00",
        "warmthFactor": 4,
        "waterproof": false,
        "style": "FORMAL",
        "material": "COTTON"
    }