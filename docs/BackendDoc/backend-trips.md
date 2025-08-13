## Events API

> **Prefix:** `/api/events`  
> **Auth:** required

### Create Event
`POST /api/events/createEvent`

**Body**
```json
{
  "name": "Cape Town Trip",
  "location": "Cape Town",
  "dateFrom": "2025-08-14T09:00:00.000Z",
  "dateTo":   "2025-08-16T18:00:00.000Z",
  "style": "Casual",
  "isTrip": true
}

### Reponse:
{
  "id": "b62bd858-0f9f-4c9b-8ec7-74f1b6551608",
  "name": "Cape Town Trip",
  "location": "Cape Town",
  "weather": "...",
  "dateFrom": "2025-08-14T09:00:00.000Z",
  "dateTo": "2025-08-16T18:00:00.000Z",
  "style": "Casual"
}


### Create a packing list 
'POST /api/packing'

Body: 
{
  "tripId": "b62bd858-0f9f-4c9b-8ec7-74f1b6551608",
  "items": ["<closetItemId1>", "<closetItemId2>"],
  "outfits": ["<outfitId1>"],
  "others": ["Toothbrush", "Phone charger", "Sunscreen"]
}

Response:
{
  "id": "f7214070-0b42-4a9e-93df-4cca35aab2e3",
  "userId": "7b437063-ff33-45f6-9ca8-8463ca55aa34",
  "tripId": "b62bd858-0f9f-4c9b-8ec7-74f1b6551608",
  "updatedAt": "2025-08-13T19:45:41.674Z",
  "items": [...],
  "outfits": [...],
  "others": [...]
}

### Get Packing List (by Trip)

'GET /api/packing/:tripId'

Response:
{
  "id": "...",
  "userId": "...",
  "tripId": "...",
  "updatedAt": "...",
  "items": [...],
  "outfits": [...],
  "others": [...]
}


### Update Packing List
'PUT /api/packing/:listId'

Body:
{
  "items":   [{ "id": "<PackingItem.id>",   "packed": true }],
  "outfits": [{ "id": "<PackingOutfit.id>", "packed": false }],
  "others":  [{ "id": "<PackingOther.id>",  "packed": true }]
}


### Delete Packing list:
'DELETE /api/packing/:listId'