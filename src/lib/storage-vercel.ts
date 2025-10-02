import { ReportMetadata } from './storage';

export interface ReportsIndex {
  reports: ReportMetadata[];
}

// Vercel KV based storage (for production)
export class VercelReportStorage {
  private static KV_URL = process.env.KV_URL || process.env.KV_REST_API_URL;
  private static KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API_READ_ONLY_TOKEN;

  static async ensureKVConnection(): Promise<void> {
    // In development, fallback to memory storage if KV is not configured
    if (!this.KV_URL || !this.KV_TOKEN) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('KV not configured, using fallback storage for development');
        return;
      }
      throw new Error('KV storage not configured');
    }
  }

  static generateFilename(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}.md`;
  }

  static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  static async saveReport(
    content: string,
    query: string,
    modelsUsed: string[]
  ): Promise<{ filename: string; metadata: ReportMetadata }> {
    await this.ensureKVConnection();

    const filename = this.generateFilename();

    // Create metadata
    const metadata: ReportMetadata = {
      filename,
      timestamp: new Date().toISOString(),
      query,
      wordCount: this.countWords(content),
      models_used: modelsUsed
    };

    // Store the report content and metadata in KV
    if (this.KV_URL && this.KV_TOKEN) {
      // Production: Use Vercel KV
      try {
        const reportKey = `report:${filename}`;
        const indexKey = 'reports:index';

        // Store the report content
        await fetch(`${this.KV_URL}/set/${reportKey}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.KV_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content, metadata }),
        });

        // Update the index
        const indexResponse = await fetch(`${this.KV_URL}/get/${indexKey}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.KV_TOKEN}`,
          },
        });

        let index: ReportsIndex = { reports: [] };
        if (indexResponse.ok) {
          const indexData = await indexResponse.json();
          index = JSON.parse(indexData.result || '{"reports":[]}');
        }

        // Add new report to the beginning
        index.reports.unshift(metadata);

        // Keep only the last 100 reports
        if (index.reports.length > 100) {
          index.reports = index.reports.slice(0, 100);
        }

        // Save the updated index
        await fetch(`${this.KV_URL}/set/${indexKey}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.KV_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(index),
        });

      } catch (error) {
        console.error('Failed to save to KV:', error);
        throw new Error('Failed to save report');
      }
    } else {
      // Development: Fallback to console or memory storage
      console.log('Development mode - report would be saved:', { filename, metadata, content });
      throw new Error('KV storage not available in development');
    }

    return { filename, metadata };
  }

  static async getReportsIndex(): Promise<ReportsIndex> {
    await this.ensureKVConnection();

    if (this.KV_URL && this.KV_TOKEN) {
      try {
        const response = await fetch(`${this.KV_URL}/get/reports:index`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.KV_TOKEN}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          return JSON.parse(data.result || '{"reports":[]}');
        }
      } catch (error) {
        console.error('Failed to get reports index:', error);
      }
    }

    return { reports: [] };
  }

  static async getReport(filename: string): Promise<{ content: string; metadata: ReportMetadata | null }> {
    await this.ensureKVConnection();

    if (this.KV_URL && this.KV_TOKEN) {
      try {
        const response = await fetch(`${this.KV_URL}/get/report:${filename}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.KV_TOKEN}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          const reportData = JSON.parse(data.result || '{}');
          return {
            content: reportData.content || '',
            metadata: reportData.metadata || null
          };
        }
      } catch (error) {
        console.error('Failed to get report:', error);
      }
    }

    throw new Error(`Report not found: ${filename}`);
  }

  static getReportUrl(filename: string): string {
    return `/reports/${filename.replace('.md', '')}`;
  }
}