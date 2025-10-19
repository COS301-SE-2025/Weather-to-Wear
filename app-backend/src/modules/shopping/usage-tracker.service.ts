import fs from 'fs';
import path from 'path';

interface UsageData {
  month: string; // Format: "2024-10"
  rekognitionCalls: number;
  serpApiCalls: number;
  lastReset: string;
}

export class UsageTracker {
  private usageFile: string;
  private readonly MAX_REKOGNITION_CALLS = 250; // Conservative limit
  private readonly MAX_SERPAPI_CALLS = 1000; // SerpApi limit if needed

  constructor() {
    this.usageFile = path.join(process.cwd(), 'usage-tracking.json');
    this.initializeUsageFile();
  }

  private initializeUsageFile() {
    if (!fs.existsSync(this.usageFile)) {
      const initialData: UsageData = {
        month: this.getCurrentMonth(),
        rekognitionCalls: 0,
        serpApiCalls: 0,
        lastReset: new Date().toISOString()
      };
      fs.writeFileSync(this.usageFile, JSON.stringify(initialData, null, 2));
    }
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  private loadUsageData(): UsageData {
    try {
      const data = fs.readFileSync(this.usageFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to load usage data:', error);
      return {
        month: this.getCurrentMonth(),
        rekognitionCalls: 0,
        serpApiCalls: 0,
        lastReset: new Date().toISOString()
      };
    }
  }

  private saveUsageData(data: UsageData) {
    try {
      fs.writeFileSync(this.usageFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save usage data:', error);
    }
  }

  /**
   * Check if we can make a Rekognition call
   */
  canMakeRekognitionCall(): boolean {
    const usage = this.loadUsageData();
    console.log(`Loading usage data: ${JSON.stringify(usage)}`);
    
    // Check if we need to reset for new month
    if (usage.month !== this.getCurrentMonth()) {
      console.log(`Month changed from ${usage.month} to ${this.getCurrentMonth()}, resetting...`);
      this.resetMonthlyUsage();
      return true;
    }
    
    const canMake = usage.rekognitionCalls < this.MAX_REKOGNITION_CALLS;
    console.log(`Usage check: ${usage.rekognitionCalls}/${this.MAX_REKOGNITION_CALLS}, can make call: ${canMake}`);
    return canMake;
  }

  /**
   * Record a Rekognition call and return remaining quota
   */
  recordRekognitionCall(): { success: boolean; remaining: number; totalUsed: number } {
    if (!this.canMakeRekognitionCall()) {
      const usage = this.loadUsageData();
      return {
        success: false,
        remaining: 0,
        totalUsed: usage.rekognitionCalls
      };
    }

    const usage = this.loadUsageData();
    usage.rekognitionCalls += 1;
    this.saveUsageData(usage);

    return {
      success: true,
      remaining: this.MAX_REKOGNITION_CALLS - usage.rekognitionCalls,
      totalUsed: usage.rekognitionCalls
    };
  }

  /**
   * Get current usage stats
   */
  getUsageStats(): {
    rekognition: { used: number; limit: number; remaining: number };
    serpApi: { used: number; limit: number; remaining: number };
    month: string;
  } {
    const usage = this.loadUsageData();
    
    return {
      rekognition: {
        used: usage.rekognitionCalls,
        limit: this.MAX_REKOGNITION_CALLS,
        remaining: this.MAX_REKOGNITION_CALLS - usage.rekognitionCalls
      },
      serpApi: {
        used: usage.serpApiCalls,
        limit: this.MAX_SERPAPI_CALLS,
        remaining: this.MAX_SERPAPI_CALLS - usage.serpApiCalls
      },
      month: usage.month
    };
  }

  private resetMonthlyUsage() {
    const newData: UsageData = {
      month: this.getCurrentMonth(),
      rekognitionCalls: 0,
      serpApiCalls: 0,
      lastReset: new Date().toISOString()
    };
    this.saveUsageData(newData);
    console.log(`Usage reset for new month: ${this.getCurrentMonth()}`);
  }

  /**
   * Admin function to manually reset usage (for testing)
   */
  resetUsage() {
    this.resetMonthlyUsage();
  }
}

export default new UsageTracker();
