import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../auth/auth.middleware';
import serpApiService from './serpapi.service';
import protectedRekognitionService from './protected-rekognition.service';
import usageTracker from './usage-tracker.service';
import closetService from '../closet/closet.service';
import usersService from '../users/users.service';
import { cdnUrlFor } from '../../utils/s3';
import { mapHexColorsToNames } from './color-mapping.util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

class SafeShoppingController {
  /**
   * Debug endpoint to check if an item exists in the database
   */
  debugGetItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { itemId } = req.params;
      const { user } = req as AuthenticatedRequest;
      
      console.log('Debug: Looking for item ID:', itemId);
      console.log('Debug: User ID:', user?.id);
      
      // Check if item exists at all
      const item = await prisma.closetItem.findUnique({
        where: { id: itemId },
        include: {
          owner: {
            select: { id: true, name: true, email: true }
          }
        }
      });
      
      if (!item) {
        console.log('Debug: Item not found in database');
        res.status(404).json({ 
          error: 'Item not found in database', 
          itemId,
          searchedBy: user?.id 
        });
        return;
      }
      
      console.log('Debug: Item found, owner:', item.ownerId);
      console.log('Debug: Current user:', user?.id);
      console.log('Debug: User owns item:', item.ownerId === user?.id);
      
      res.status(200).json({
        found: true,
        item: {
          id: item.id,
          category: item.category,
          ownerId: item.ownerId,
          filename: item.filename,
          createdAt: item.createdAt,
          style: item.style,
          material: item.material,
          colorHex: item.colorHex
        },
        owner: item.owner,
        currentUser: user?.id,
        userOwnsItem: item.ownerId === user?.id
      });
    } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ error: 'Debug failed', details: error });
    }
  };


  getUsageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { reset } = req.query;
      
      if (reset === 'true') {
        usageTracker.resetUsage();
        console.log('Usage stats reset via query parameter');
      }
      
      const stats = usageTracker.getUsageStats();
      res.status(200).json({
        ...stats,
        wasReset: reset === 'true'
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get usage stats' });
    }
  };


  resetUsageStats = async (req: Request, res: Response): Promise<void> => {
    try {
      usageTracker.resetUsage();
      const newStats = usageTracker.getUsageStats();
      console.log('Usage stats reset by admin');
      res.status(200).json({
        message: 'Usage stats reset successfully',
        newStats
      });
    } catch (error) {
      console.error('Failed to reset usage stats:', error);
      res.status(500).json({ error: 'Failed to reset usage stats' });
    }
  };


  findPurchaseOptions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user } = req as AuthenticatedRequest;
      const { itemId } = req.params;
      const { location, forceMetadata = false } = req.body;
      
      console.log(`Shopping search for item ${itemId} by user ${user?.id}`);
      
      const itemExists = await prisma.closetItem.findUnique({
        where: { id: itemId }
      });
      
      if (!itemExists) {
        console.log(`Item ${itemId} does not exist in database`);
        res.status(404).json({ 
          error: 'Clothing item not found',
          details: 'Item does not exist in database',
          itemId,
          userId: user?.id
        });
        return;
      }
      
      console.log(`Item ${itemId} found. Owner: ${itemExists.ownerId}, Searcher: ${user?.id}`);
      const clothingItem = itemExists;
      
      const userProfile = await usersService.getById(user!.id);
      let userLocation = location || userProfile?.location || "Pretoria, South Africa";
      let searchQuery = '';
      let searchMethod = 'metadata';
      let quotaInfo = { remaining: 0, totalUsed: 0 };
      let fallbackReason = '';
      let attemptedVisualAnalysis = false;
      
      // Strategy 1: Try Rekognition + Color Extraction if quota allows and not forced to metadata
      // Use the exact same image URL pattern as the inspo system
      const imageUrl = clothingItem.filename ? cdnUrlFor(clothingItem.filename) : '';
      console.log(`Generated image URL for ${clothingItem.filename}: ${imageUrl}`);
      console.log(`Image URL starts with /uploads/: ${imageUrl.startsWith('/uploads/')}`);
      console.log(`INTERNAL_BASE_URL: ${process.env.INTERNAL_BASE_URL}`);
      console.log(`PUBLIC_BASE_URL: ${process.env.PUBLIC_BASE_URL}`);
      
      if (!forceMetadata && clothingItem.filename && imageUrl) {
        // Check if we can make a Rekognition call first
        const canMakeCall = usageTracker.canMakeRekognitionCall();
        const currentStats = usageTracker.getUsageStats();
        console.log(`Pre-analysis check - Can make Rekognition call: ${canMakeCall}`);
        console.log(`Current usage stats:`, currentStats);
        
        if (canMakeCall) {
          attemptedVisualAnalysis = true;
          
          let extractedColors: string[] = [];
          console.log('Skipping color extraction due to endpoint issues');

          console.log('Attempting Rekognition analysis...');
          const rekognitionResult = await protectedRekognitionService.extractClothingKeywords(imageUrl);
          console.log('Rekognition result:', rekognitionResult);
          console.log('Rekognition fallback reason:', rekognitionResult.fallbackReason);
          
          quotaInfo = rekognitionResult.quotaInfo;
          
          if (rekognitionResult.usedRekognition && rekognitionResult.keywords.trim()) {
            const colorPart = extractedColors.length > 0 ? extractedColors.slice(0, 2).join(' ') : '';
            searchQuery = `${colorPart} ${rekognitionResult.keywords}`.trim();
            searchMethod = 'ai-visual-analysis';
          } else {
            if (rekognitionResult.fallbackReason === 'quota-exceeded') {
              fallbackReason = 'AI visual search quota exceeded for this month. Using metadata search only.';
            } else if (rekognitionResult.fallbackReason === 'analysis-failed') {
              console.log('Visual analysis failed - using metadata search silently');
            }
          }
        } else {
          quotaInfo = { remaining: currentStats.rekognition.remaining, totalUsed: currentStats.rekognition.used };
          fallbackReason = 'AI visual search quota exceeded for this month. Using metadata search only.';
        }
      }
      
      if (!searchQuery.trim() || forceMetadata) {
        const parts = [];
        const descriptiveParts = [];
        
        if (clothingItem.colorHex) {
          console.log(`Color mapping for ${clothingItem.colorHex}:`);
          const colorName = mapHexColorsToNames([clothingItem.colorHex])[0];
          console.log(`Mapped to color name: ${colorName}`);
          
          if (colorName && colorName !== 'Unknown') {
            parts.push(colorName.toLowerCase());
            descriptiveParts.push(`${colorName} (${clothingItem.colorHex})`);
          } else {
            // If we can't map the color, try to use hex directly
            descriptiveParts.push(`Color: ${clothingItem.colorHex}`);
          }
        }
        
        if (clothingItem.category) {
          const categoryName = clothingItem.category.toLowerCase();
          
          // Add gender-specific terms based on category
          const genderSpecificTerms: Record<string, { terms: string[], description: string }> = {
            'tshirt': { terms: ['mens', 'unisex', 't-shirt', 'tee'], description: 'Men\'s T-Shirt' },
            'longsleeve': { terms: ['mens', 'long', 'sleeve', 'shirt'], description: 'Men\'s Long Sleeve Shirt' },
            'sleeveless': { terms: ['mens', 'tank', 'top', 'vest'], description: 'Men\'s Sleeveless Top' },
            'pants': { terms: ['mens', 'pants', 'trousers'], description: 'Men\'s Pants/Trousers' },
            'jeans': { terms: ['mens', 'jeans', 'denim'], description: 'Men\'s Jeans' },
            'shorts': { terms: ['mens', 'shorts'], description: 'Men\'s Shorts' },
            'skirt': { terms: ['womens', 'skirt'], description: 'Women\'s Skirt' },
            'sweater': { terms: ['mens', 'sweater', 'jumper', 'pullover'], description: 'Men\'s Sweater/Jumper' },
            'hoodie': { terms: ['mens', 'hoodie', 'sweatshirt'], description: 'Men\'s Hoodie/Sweatshirt' },
            'coat': { terms: ['mens', 'coat', 'overcoat'], description: 'Men\'s Coat/Overcoat' },
            'blazer': { terms: ['mens', 'blazer', 'suit', 'jacket'], description: 'Men\'s Blazer/Suit Jacket' },
            'jacket': { terms: ['mens', 'jacket'], description: 'Men\'s Jacket' },
            'raincoat': { terms: ['mens', 'raincoat', 'rain', 'jacket'], description: 'Men\'s Raincoat' },
            'shoes': { terms: ['mens', 'shoes'], description: 'Men\'s Shoes' },
            'boots': { terms: ['mens', 'boots'], description: 'Men\'s Boots' },
            'sandals': { terms: ['mens', 'sandals'], description: 'Men\'s Sandals' },
            'heels': { terms: ['womens', 'high', 'heels'], description: 'Women\'s High Heels' },
            'beanie': { terms: ['unisex', 'beanie', 'knit', 'hat'], description: 'Beanie/Knit Hat' },
            'hat': { terms: ['unisex', 'hat', 'cap'], description: 'Hat/Cap' }
          };
          
          const categoryInfo = genderSpecificTerms[categoryName];
          if (categoryInfo) {
            categoryInfo.terms.forEach(term => parts.push(term));
            descriptiveParts.push(categoryInfo.description);
          } else {
            parts.push('mens', categoryName); 
            descriptiveParts.push(`Men's ${clothingItem.category}`);
          }
        }
        
        if (clothingItem.layerCategory) {
          const layerDescriptions: Record<string, string> = {
            'BASE_TOP': 'Base Layer Top',
            'BASE_BOTTOM': 'Base Layer Bottom',
            'MID_TOP': 'Mid Layer Top',
            'OUTERWEAR': 'Outerwear',
            'FOOTWEAR': 'Footwear',
            'HEADWEAR': 'Headwear',
            'ACCESSORIES': 'Accessories'
          };
          
          const layerDesc = layerDescriptions[clothingItem.layerCategory] || clothingItem.layerCategory;
          descriptiveParts.push(`Layer: ${layerDesc}`);
        }
        
        if (clothingItem.style) {
          const styleName = clothingItem.style.toLowerCase();
          parts.push(styleName);
          
          const styleDescriptions: Record<string, string> = {
            'casual': 'Casual',
            'formal': 'Formal/Business',
            'athletic': 'Athletic/Sportswear',
            'smart': 'Smart Casual',
            'vintage': 'Vintage Style',
            'modern': 'Modern Style'
          };
          
          const styleDesc = styleDescriptions[styleName] || clothingItem.style;
          descriptiveParts.push(`${styleDesc} style`);
          
          if (styleName === 'formal') {
            parts.push('business', 'professional');
          } else if (styleName === 'athletic') {
            parts.push('sport', 'gym', 'activewear');
          } else if (styleName === 'casual') {
            parts.push('everyday', 'comfortable');
          }
        }
        
        if (clothingItem.material) {
          const materialName = clothingItem.material.toLowerCase();
          parts.push(materialName);
          
          const materialTerms: Record<string, string[]> = {
            'cotton': ['cotton', '100%', 'natural'],
            'polyester': ['polyester', 'synthetic', 'blend'],
            'wool': ['wool', 'woolen', 'warm'],
            'leather': ['leather', 'genuine', 'real'],
            'denim': ['denim', 'cotton', 'jeans'],
            'silk': ['silk', 'premium', 'luxury'],
            'linen': ['linen', 'breathable', 'summer'],
            'nylon': ['nylon', 'durable', 'synthetic'],
            'spandex': ['spandex', 'stretch', 'flexible'],
            'canvas': ['canvas', 'heavy', 'durable']
          };
          
          const additionalTerms = materialTerms[materialName];
          if (additionalTerms) {
            additionalTerms.forEach(term => parts.push(term));
          }
          
          descriptiveParts.push(`${clothingItem.material} material`);
        }
        
        // Add additional attributes if available
        if (clothingItem.waterproof) {
          parts.push('waterproof');
          descriptiveParts.push('Waterproof');
        }
        
        if (clothingItem.warmthFactor) {
          if (clothingItem.warmthFactor >= 15) {
            parts.push('warm', 'winter');
            descriptiveParts.push(`High warmth (${clothingItem.warmthFactor}/20)`);
          } else if (clothingItem.warmthFactor >= 10) {
            parts.push('medium-warm');
            descriptiveParts.push(`Medium warmth (${clothingItem.warmthFactor}/20)`);
          } else {
            parts.push('lightweight', 'summer');
            descriptiveParts.push(`Lightweight (${clothingItem.warmthFactor}/20)`);
          }
        }
        
        // Add dominant colors if available
        if (clothingItem.dominantColors) {
          let colorArray: string[] = [];
          
          // Handle both JSON string and array formats
          if (typeof clothingItem.dominantColors === 'string') {
            try {
              const parsed = JSON.parse(clothingItem.dominantColors);
              if (Array.isArray(parsed)) {
                colorArray = parsed.filter(color => typeof color === 'string');
              }
            } catch (e) {
              // If parsing fails, treat as single color
              colorArray = [clothingItem.dominantColors];
            }
          } else if (Array.isArray(clothingItem.dominantColors)) {
            colorArray = clothingItem.dominantColors
              .filter((color): color is string => typeof color === 'string' && color !== null);
          }
          
          if (colorArray.length > 0) {
            const dominantColorNames = mapHexColorsToNames(colorArray.slice(0, 2));
            dominantColorNames.forEach(colorName => {
              if (colorName && colorName !== 'Unknown') {
                parts.push(colorName.toLowerCase());
              }
            });
            if (dominantColorNames.length > 0) {
              descriptiveParts.push(`Dominant colors: ${dominantColorNames.join(', ')}`);
            }
          }
        }
        
        if (descriptiveParts.length === 0) {
          descriptiveParts.push('General clothing item');
        }
        
        if (clothingItem.ownerId !== user?.id) {
          descriptiveParts.push('From inspiration feed');
        }
        
        let baseQuery = parts.join(' ');
        
        const categoryName = clothingItem.category?.toLowerCase();
        let genderFilteredQuery = baseQuery;
        
        if (categoryName && !['beanie', 'hat', 'unisex'].includes(categoryName)) {
          if (categoryName === 'skirt' || categoryName === 'heels') {
            genderFilteredQuery = baseQuery;
          } else {
            genderFilteredQuery = `${baseQuery} -womens -ladies -girls -feminine -dress -blouse`;
          }
        }
        
        searchQuery = genderFilteredQuery;
        
        const descriptiveQuery = descriptiveParts.length > 0 ? descriptiveParts.join(' • ') : searchQuery;
        
        searchQuery = parts.join(' ');
        (req as any).descriptiveQuery = descriptiveQuery; 
        
        if (forceMetadata) {
          searchMethod = 'metadata-quick';
        } else {
          searchMethod = 'metadata-fallback';
        }
        
        if (!searchQuery.trim()) {
          res.status(400).json({ 
            error: 'No search terms available',
            suggestion: 'Please add more details to this clothing item'
          });
          return;
        }
      }
      
      // Search for purchase options
      let purchaseOptions: any[] = [];
      if (searchQuery.trim()) {
        purchaseOptions = await this.searchWithSerpApi(searchQuery, userLocation);
      }

      const searchMethodDescriptions = {
        'ai-visual-analysis': 'AI Visual Analysis',
        'metadata-quick': 'Quick Search (Details)',
        'metadata-fallback': 'Metadata Search (AI Fallback)',
        'metadata': 'Metadata Search'
      };

      const displayQuery = (req as any).descriptiveQuery || searchQuery;
      
      const responseData: any = {
        item: {
          id: clothingItem.id,
          category: clothingItem.category,
          imageUrl: imageUrl,
          ownedByUser: clothingItem.ownerId === user?.id
        },
        searchQuery: displayQuery,
        actualQuery: searchQuery,   
        searchMethod: searchMethodDescriptions[searchMethod as keyof typeof searchMethodDescriptions] || searchMethod,
        location: {
          used: userLocation,
          source: location ? 'request' : (userProfile?.location ? 'profile' : 'default')
        },
        quota: {
          rekognition: quotaInfo,
          canUseRekognition: usageTracker.canMakeRekognitionCall()
        },
        purchaseOptions: purchaseOptions.map(option => ({
          title: option.title,
          store: option.source,
          price: option.price,
          extractedPrice: option.extracted_price,
          productUrl: option.product_link,
          thumbnail: option.thumbnail,
          rating: option.rating,
          reviews: option.reviews
        })),
        totalResults: purchaseOptions.length
      };

      if (attemptedVisualAnalysis && fallbackReason && fallbackReason.includes('quota exceeded')) {
        responseData.message = fallbackReason;
      }

      res.status(200).json(responseData);
      
    } catch (error) {
      console.error('Safe search error:', error);
      res.status(500).json({ error: 'Failed to find purchase options' });
    }
  };

  private async searchWithSerpApi(query: string, location: string) {
    try {
      return await serpApiService.findPurchaseOptions(
        { category: query }, 
        location
      );
    } catch (error) {
      console.error('SerpApi search failed:', error);
      return [];
    }
  }

 
  debugUsageFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const path = require('path');
      const fs = require('fs');
      
      const usageFile = path.join(process.cwd(), 'usage-tracking.json');
      console.log('Usage file path:', usageFile);
      console.log('Current working directory:', process.cwd());
      
      let fileExists = false;
      let fileContent = {};
      
      try {
        fileExists = fs.existsSync(usageFile);
        if (fileExists) {
          const content = fs.readFileSync(usageFile, 'utf8');
          fileContent = JSON.parse(content);
        }
      } catch (error) {
        console.error('Error reading usage file:', error);
      }
      
      const stats = usageTracker.getUsageStats();
      
      res.status(200).json({
        usageFilePath: usageFile,
        workingDirectory: process.cwd(),
        fileExists,
        fileContent,
        trackerStats: stats,
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error('Debug usage file error:', error);
      res.status(500).json({ error: 'Debug failed', details: error });
    }
  };

  /**
   * Debug endpoint to test color mapping
   */
  debugColorMapping = async (req: Request, res: Response): Promise<void> => {
    try {
      const { hex } = req.query;
      
      if (!hex || typeof hex !== 'string') {
        res.status(400).json({ error: 'Please provide a hex color query parameter' });
        return;
      }
      
      console.log(`Testing color mapping for hex: ${hex}`);
      const colorName = mapHexColorsToNames([hex])[0];
      console.log(`Mapped to: ${colorName}`);
      
      res.status(200).json({
        inputHex: hex,
        mappedColorName: colorName,
        isValid: colorName !== 'Unknown'
      });
    } catch (error) {
      console.error('Color mapping debug error:', error);
      res.status(500).json({ error: 'Color mapping test failed', details: error });
    }
  };

}

export default new SafeShoppingController();
