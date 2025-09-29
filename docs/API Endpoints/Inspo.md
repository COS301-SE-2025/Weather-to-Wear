# Inspiration Outfits API Documentation

## Overview
The Inspiration (Inspo) system generates outfit recommendations based on users' social media likes. Users like outfit posts in the social media feed, and the system extracts clothing items and their tags to create personalized outfit recommendations. The system suggests appropriate weather conditions for the recommended outfits.

## Endpoints

### 1. Like an Item for Inspiration (DEPRECATED)
**POST** `/api/inspo/like`

⚠️ **DEPRECATED:** This endpoint is no longer supported. Users should like social media posts instead to build inspiration preferences.

**Response:**
```json
{
  "error": "This endpoint is deprecated. Items are now liked through social media posts. Use the social media like endpoints instead.",
  "suggestion": "Like outfit posts in the social media feed to build your inspiration preferences."
}
```

---

### 2. Generate Inspiration Outfits
**POST** `/api/inspo/generate`

Generates outfit recommendations based on liked items and applies weather filtering.

**Headers:**
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "weatherFilter": {
    "minTemp": 15,
    "maxTemp": 25,
    "conditions": ["sunny", "cloudy"]
  },
  "styleFilter": "Casual",
  "limit": 10
}
```

**Response:**
```json
[
  {
    "id": "generated-0",
    "overallStyle": "Casual",
    "warmthRating": 15,
    "waterproof": true,
    "tags": ["style:casual", "color:blue", "warmth:medium"],
    "recommendedWeather": {
      "minTemp": 10,
      "maxTemp": 25,
      "conditions": ["mild", "cool", "sunny", "cloudy", "rainy"]
    },
    "score": 8.5,
    "inspoItems": [
      {
        "closetItemId": "item-123",
        "imageUrl": "/api/uploads/shirt.jpg",
        "layerCategory": "base_top",
        "category": "SHIRT",
        "style": "Casual",
        "colorHex": "#0066cc",
        "warmthFactor": 5,
        "waterproof": false,
        "dominantColors": ["#0066cc", "#ffffff"],
        "sortOrder": 1
      }
    ]
  }
]
```

---

### 3. Get All Inspiration Outfits
**GET** `/api/inspo`

Retrieves all stored inspiration outfits for the authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "inspo-456",
    "overallStyle": "Business",
    "warmthRating": 12,
    "waterproof": false,
    "tags": ["style:business", "color:navy", "warmth:medium"],
    "recommendedWeather": {
      "minTemp": 18,
      "maxTemp": 30,
      "conditions": ["warm", "mild", "sunny", "cloudy"]
    },
    "score": 0,
    "inspoItems": [...]
  }
]
```

---

### 4. Delete Inspiration Outfit
**DELETE** `/api/inspo/:id`

Deletes a specific inspiration outfit.

**Headers:**
```
Authorization: Bearer <token>
```

**Parameters:**
- `id`: The ID of the inspiration outfit to delete

**Response:**
```json
{
  "success": true,
  "message": "Inspiration outfit deleted"
}
```

---

## Data Models

### InspoOutfitRecommendation
```typescript
{
  id: string;
  overallStyle: string;
  warmthRating: number;
  waterproof: boolean;
  tags: string[];
  recommendedWeather: WeatherCondition;
  score: number;
  inspoItems: InspoItemRecommendation[];
}
```

### WeatherCondition
```typescript
{
  minTemp: number;
  maxTemp: number;
  conditions: string[]; // ["sunny", "rainy", "windy", etc.]
}
```

### InspoItemRecommendation
```typescript
{
  closetItemId: string;
  imageUrl: string;
  layerCategory: string;
  category: string;
  style?: string;
  colorHex?: string;
  warmthFactor?: number;
  waterproof?: boolean;
  dominantColors?: string[];
  sortOrder: number;
}
```

## Weather Filtering

### Temperature Filters
- `minTemp`: Minimum temperature for outfit appropriateness
- `maxTemp`: Maximum temperature for outfit appropriateness

### Condition Filters
Possible conditions:
- `"hot"`, `"warm"`, `"mild"`, `"cool"`, `"cold"`, `"freezing"`
- `"sunny"`, `"cloudy"`, `"rainy"`, `"drizzle"`, `"windy"`

## Tags System

The system automatically extracts tags from liked items:

### Style Tags
- `style:casual`, `style:formal`, `style:athletic`, etc.

### Category Tags
- `category:shirt`, `category:pants`, `category:shoes`, etc.

### Color Tags
- `color:light`, `color:dark`, `color:medium`
- `color:saturated`, `color:muted`
- `color:blue`, `color:red`, etc. (named colors)

### Warmth Tags
- `warmth:high` (8+ warmth factor)
- `warmth:medium` (5-7 warmth factor)
- `warmth:low` (<5 warmth factor)

### Feature Tags
- `feature:waterproof`

### Layer Tags
- `layer:base_top`, `layer:base_bottom`, `layer:footwear`, etc.

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `201`: Created
- `400`: Bad Request (invalid input)
- `401`: Unauthorized (missing/invalid token)
- `404`: Not Found
- `500`: Internal Server Error

Error responses include a descriptive message:
```json
{
  "error": "Description of the error"
}
```
