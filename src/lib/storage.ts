import fs from 'fs/promises';
import path from 'path';

export interface ReportMetadata {
  filename: string;
  timestamp: string;
  query: string;
  wordCount: number;
  models_used: string[];
}

export interface ReportsIndex {
  reports: ReportMetadata[];
}

const REPORTS_DIR = path.join(process.cwd(), 'public', 'reports');
const INDEX_FILE = path.join(REPORTS_DIR, 'index.json');

export class ReportStorage {
  static async ensureReportsDir(): Promise<void> {
    try {
      await fs.access(REPORTS_DIR);
    } catch {
      await fs.mkdir(REPORTS_DIR, { recursive: true });
    }
  }

  static async ensureIndexFile(): Promise<void> {
    try {
      await fs.access(INDEX_FILE);
    } catch {
      const initialIndex: ReportsIndex = { reports: [] };
      await fs.writeFile(INDEX_FILE, JSON.stringify(initialIndex, null, 2));
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
    await this.ensureReportsDir();
    await this.ensureIndexFile();

    const filename = this.generateFilename();
    const filePath = path.join(REPORTS_DIR, filename);

    // Save the markdown file
    await fs.writeFile(filePath, content);

    // Create metadata
    const metadata: ReportMetadata = {
      filename,
      timestamp: new Date().toISOString(),
      query,
      wordCount: this.countWords(content),
      models_used: modelsUsed
    };

    // Update index
    await this.updateIndex(metadata);

    return { filename, metadata };
  }

  static async updateIndex(newReport: ReportMetadata): Promise<void> {
    const indexContent = await fs.readFile(INDEX_FILE, 'utf-8');
    const index: ReportsIndex = JSON.parse(indexContent);

    // Add new report to the beginning of the array (most recent first)
    index.reports.unshift(newReport);

    // Keep only the last 100 reports to prevent unbounded growth
    if (index.reports.length > 100) {
      index.reports = index.reports.slice(0, 100);
    }

    await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
  }

  static async getReportsIndex(): Promise<ReportsIndex> {
    await this.ensureIndexFile();
    const indexContent = await fs.readFile(INDEX_FILE, 'utf-8');
    return JSON.parse(indexContent);
  }

  static async getReport(filename: string): Promise<{ content: string; metadata: ReportMetadata | null }> {
    const filePath = path.join(REPORTS_DIR, filename);

    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // Try to find metadata in index
      const index = await this.getReportsIndex();
      const metadata = index.reports.find(r => r.filename === filename) || null;

      return { content, metadata };
    } catch (error) {
      throw new Error(`Report not found: ${filename}`);
    }
  }

  static async getRecentReports(limit: number = 10): Promise<ReportMetadata[]> {
    const index = await this.getReportsIndex();
    return index.reports.slice(0, limit);
  }

  static async deleteReport(filename: string): Promise<void> {
    const filePath = path.join(REPORTS_DIR, filename);

    // Delete the file
    await fs.unlink(filePath);

    // Remove from index
    const index = await this.getReportsIndex();
    index.reports = index.reports.filter(r => r.filename !== filename);
    await fs.writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
  }

  static getReportUrl(filename: string): string {
    return `/reports/${filename.replace('.md', '')}`;
  }

  static getPublicReportPath(filename: string): string {
    return `/reports/${filename}`;
  }
}