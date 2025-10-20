# Shopping Feature Implementation

## Overview
The shopping feature allows users to find where to buy clothing items from their closet using AI image analysis and shopping search APIs.

## Features
- **Visual Analysis**: Uses AWS Rekognition to extract keywords from clothing images
- **Shopping Search**: Uses SerpAPI to find purchase options from various stores
- **Usage Limits**: Built-in quotas to stay within free tiers (250 Rekognition calls/month)
- **Fallback System**: Falls back to metadata search when visual analysis fails or quota exceeded

## API Endpoints

### Get Usage Stats
```
GET /api/shopping/usage-stats
```
Returns current usage statistics for the month.

### Find Purchase Options
```
POST /api/shopping/item/:itemId/purchase-options
Body: {
  "location": "Pretoria, South Africa" (optional),
  "forceMetadata": false (optional)
}
```
Finds where to buy a specific clothing item.

## Setup Instructions

### 1. Install Dependencies
```bash
npm install aws-sdk google-search-results-nodejs
```

### 2. Environment Variables
Add to your `.env` file:
```env
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
SERPAPI_KEY=your_serpapi_key
```

### 3. AWS Setup
1. Create AWS account (free tier includes 5,000 Rekognition calls/month)
2. Create IAM user with Rekognition permissions
3. Generate access keys

### 4. SerpAPI Setup
1. Sign up at serpapi.com
2. Get API key from dashboard
3. Add to environment variables

## Usage Quotas
- **Rekognition**: 250 calls/month (conservative limit)
- **SerpAPI**: Pay per search (reasonable cost)
- **Automatic fallback** to metadata search when quota exceeded

## How It Works

1. **Image Analysis**: Rekognition analyzes clothing image to extract:
   - Clothing type (shirt, pants, jacket, etc.)
   - Colors (black, white, red, etc.)
   - Materials (leather, denim, cotton, etc.)
   - Brands (Nike, Adidas, Zara, etc.)

2. **Keyword Generation**: Extracted features become search keywords:
   - Example: "black leather jacket" or "blue denim jeans"

3. **Shopping Search**: SerpAPI searches for those keywords:
   - Location-aware results
   - Multiple store options
   - Price comparison
   - Direct purchase links

4. **Fallback System**: If visual analysis fails:
   - Uses item metadata (category, style, material, brand)
   - Always provides some results

## File Structure
```
src/modules/shopping/
├── usage-tracker.service.ts    # Quota tracking
├── protected-rekognition.service.ts  # AWS Rekognition with limits
├── serpapi.service.ts          # SerpAPI integration
├── shopping.controller.ts      # Main controller
└── shopping.routes.ts          # API routes
```

## Frontend Integration Example
```typescript
const findPurchaseOptions = async (itemId: string) => {
  const response = await fetch(`/api/shopping/item/${itemId}/purchase-options`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ location: userLocation })
  });
  
  const data = await response.json();
  
  // Display results
  data.purchaseOptions.forEach(option => {
    console.log(`${option.title} - ${option.price} at ${option.store}`);
    console.log(`Buy: ${option.productUrl}`);
  });
};
```

## Cost Management
- **Free tier protection**: Automatic quota limits prevent charges
- **Usage tracking**: Persistent monthly tracking
- **Graceful fallbacks**: Always provides results even when quota exceeded
- **User visibility**: Shows quota status to users

## Testing
- Use `GET /api/shopping/usage-stats` to check current usage
- Test with various clothing items to see keyword extraction
- Verify fallback to metadata when quota exceeded
