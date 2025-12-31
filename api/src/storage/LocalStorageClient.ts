import { promises as fs } from 'fs';
import path from 'path';
import { BlobStorageClient } from './BlobStorageClient';

/**
 * Local file system implementation of BlobStorageClient
 * Stores PDFs in a local directory (./tmp by default)
 */
export class LocalStorageClient implements BlobStorageClient {
  private storageDir: string;

  constructor(storageDir: string = './tmp') {
    this.storageDir = path.resolve(storageDir);
  }

  /**
   * Initialize storage directory
   */
  private async ensureDirectory(): Promise<void> {
    try {
      await fs.access(this.storageDir);
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  /**
   * Get full file path
   */
  private getFilePath(fileName: string): string {
    // Sanitize filename to prevent directory traversal
    const sanitized = path.basename(fileName);
    return path.join(this.storageDir, sanitized);
  }

  /**
   * Store a PDF file
   */
  async storePdf(fileName: string, data: Buffer): Promise<string> {
    await this.ensureDirectory();
    const filePath = this.getFilePath(fileName);
    await fs.writeFile(filePath, data);
    return filePath;
  }

  /**
   * Retrieve a PDF file
   */
  async getPdf(fileName: string): Promise<Buffer | null> {
    const filePath = this.getFilePath(fileName);
    try {
      return await fs.readFile(filePath);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a PDF file
   */
  async deletePdf(fileName: string): Promise<void> {
    const filePath = this.getFilePath(fileName);
    try {
      await fs.unlink(filePath);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Check if a PDF file exists
   */
  async exists(fileName: string): Promise<boolean> {
    const filePath = this.getFilePath(fileName);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get a publicly accessible URL for the PDF
   * For local storage, this returns the file path
   */
  async getPublicUrl(fileName: string, _expiresInSeconds?: number): Promise<string> {
    const filePath = this.getFilePath(fileName);
    const exists = await this.exists(fileName);
    if (!exists) {
      throw new Error(`File not found: ${fileName}`);
    }
    // For local dev, return file:// URL
    return `file://${filePath}`;
  }
}
