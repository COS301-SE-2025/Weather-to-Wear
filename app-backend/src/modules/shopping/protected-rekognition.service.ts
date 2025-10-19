import { RekognitionClient, DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import usageTracker from './usage-tracker.service';

export class ProtectedRekognitionService {
  private rekognition: RekognitionClient;

  constructor() {
    this.rekognition = new RekognitionClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    });
  }


  async extractClothingKeywords(imageUrl: string): Promise<{
    keywords: string;
    usedRekognition: boolean;
    quotaInfo: { remaining: number; totalUsed: number };
    fallbackReason?: string;
  }> {
    if (!usageTracker.canMakeRekognitionCall()) {
      const stats = usageTracker.getUsageStats();
      console.log(`Rekognition quota exceeded: ${stats.rekognition.used}/${stats.rekognition.limit}`);
      
      return {
        keywords: '',
        usedRekognition: false,
        quotaInfo: { remaining: 0, totalUsed: stats.rekognition.used },
        fallbackReason: 'quota-exceeded'
      };
    }

    try {
      const recordResult = usageTracker.recordRekognitionCall();
      
      if (!recordResult.success) {
        return {
          keywords: '',
          usedRekognition: false,
          quotaInfo: { remaining: 0, totalUsed: recordResult.totalUsed },
          fallbackReason: 'usage-tracking-error'
        };
      }

      console.log(`Making Rekognition call. Remaining: ${recordResult.remaining}/250`);

      // Fetch and analyze image
      const imageBuffer = await this.fetchImageAsBuffer(imageUrl);
      
      const labelCommand = new DetectLabelsCommand({
        Image: { Bytes: imageBuffer },
        MaxLabels: 20,
        MinConfidence: 60
      });

      const labelResponse = await this.rekognition.send(labelCommand);
      const clothingKeywords = this.extractClothingFromLabels(labelResponse.Labels || []);
      
      const allKeywords = clothingKeywords;
      const searchString = this.buildSearchString(allKeywords);
      
      console.log(`Rekognition success: "${searchString}" (${recordResult.remaining} calls remaining)`);
      
      return {
        keywords: searchString,
        usedRekognition: true,
        quotaInfo: { remaining: recordResult.remaining, totalUsed: recordResult.totalUsed }
      };

    } catch (error) {
      console.error('Rekognition analysis failed:', error);
      return {
        keywords: '',
        usedRekognition: false,
        quotaInfo: { remaining: 0, totalUsed: 0 },
        fallbackReason: 'analysis-failed'
      };
    }
  }

  private async fetchImageAsBuffer(imageUrl: string): Promise<Buffer> {
    // Convert relative URLs to full URLs for Docker/internal services
    let fullImageUrl = imageUrl;
    
    if (imageUrl.startsWith('/uploads/')) {
      // For relative URLs, use the internal base URL for Docker service communication
      const internalBaseUrl = process.env.INTERNAL_BASE_URL || process.env.PUBLIC_BASE_URL || 'http://localhost:5001';
      fullImageUrl = `${internalBaseUrl}${imageUrl}`;
      console.log(`Converting relative URL ${imageUrl} to full URL: ${fullImageUrl}`);
    }
    
    const response = await fetch(fullImageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private extractClothingFromLabels(labels: any[]): string[] {
    const clothingTerms: string[] = [];
    
    const categoryMap = new Map([
      // Base Top
      ['t-shirt', 'TSHIRT'],
      ['shirt', 'TSHIRT'],
      ['top', 'TSHIRT'],
      ['blouse', 'LONGSLEEVE'],
      ['long sleeve', 'LONGSLEEVE'],
      ['tank top', 'SLEEVELESS'],
      ['sleeveless', 'SLEEVELESS'],
      ['vest', 'SLEEVELESS'],
      
      // Base Bottom
      ['pants', 'PANTS'],
      ['trousers', 'PANTS'],
      ['jeans', 'JEANS'],
      ['shorts', 'SHORTS'],
      ['skirt', 'SKIRT'],
      
      // Mid Top
      ['sweater', 'SWEATER'],
      ['hoodie', 'HOODIE'],
      ['sweatshirt', 'HOODIE'],
      ['pullover', 'SWEATER'],
      
      // Outerwear
      ['coat', 'COAT'],
      ['jacket', 'JACKET'],
      ['blazer', 'BLAZER'],
      ['raincoat', 'RAINCOAT'],
      ['windbreaker', 'JACKET'],
      
      // Footwear
      ['shoes', 'SHOES'],
      ['boots', 'BOOTS'],
      ['sandals', 'SANDALS'],
      ['heels', 'HEELS'],
      ['sneakers', 'SHOES'],
      
      // Headwear
      ['hat', 'HAT'],
      ['beanie', 'BEANIE'],
      ['cap', 'HAT'],
    ]);

    // Frontend styles from AddPage.tsx
    const styleTerms = new Set([
      'formal', 'casual', 'athletic', 'party', 'business', 'outdoor',
      'sport', 'professional', 'dressy', 'relaxed'
    ]);

    // Frontend materials from AddPage.tsx
    const materialTerms = new Set([
      'cotton', 'wool', 'polyester', 'leather', 'nylon', 'fleece',
      'denim', 'linen', 'silk', 'suede', 'fabric', 'synthetic', 'canvas', 'knit'
    ]);

    for (const label of labels) {
      if (label.Name && label.Confidence && label.Confidence > 60) {
        const labelName = label.Name.toLowerCase();
        
        // Map to frontend category
        for (const [rekLabel, frontendCategory] of categoryMap) {
          if (labelName.includes(rekLabel)) {
            clothingTerms.push(frontendCategory.toLowerCase());
            break;
          }
        }
        
        // Check if it's a style
        if (styleTerms.has(labelName)) {
          clothingTerms.push(labelName);
        }
        
        // Check if it's a material
        if (materialTerms.has(labelName)) {
          clothingTerms.push(labelName);
        }
        
        // Check parent categories for clothing
        if (label.Parents) {
          for (const parent of label.Parents) {
            if (parent.Name) {
              const parentName = parent.Name.toLowerCase();
              // Check if parent maps to a frontend category
              for (const [rekLabel, frontendCategory] of categoryMap) {
                if (parentName.includes(rekLabel)) {
                  clothingTerms.push(frontendCategory.toLowerCase());
                  break;
                }
              }
            }
          }
        }
      }
    }

    return [...new Set(clothingTerms)]; // Remove duplicates
  }



  private buildSearchString(keywords: string[]): string {
    // Prioritize and clean keywords
    const materials: string[] = [];
    const items: string[] = [];

    // Updated material set to match frontend options
    const materialSet = new Set(['cotton', 'wool', 'polyester', 'leather', 'nylon', 'fleece', 'denim', 'linen', 'silk', 'suede', 'fabric']);

    for (const keyword of keywords) {
      if (materialSet.has(keyword)) {
        materials.push(keyword);
      } else {
        items.push(keyword);
      }
    }

    const searchParts = [
      ...materials.slice(0, 1), // Max 1 material  
      ...items.slice(0, 3)      // Max 3 item types
    ];

    return searchParts.join(' ').trim();
  }
}

export default new ProtectedRekognitionService();
