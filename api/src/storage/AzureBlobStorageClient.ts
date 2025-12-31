import { BlobStorageClient } from './BlobStorageClient';

/**
 * Azure Blob Storage implementation (placeholder)
 * TODO: Implement using @azure/storage-blob
 */
export class AzureBlobStorageClient implements BlobStorageClient {
  private containerName: string;
  private connectionString: string;

  constructor(connectionString: string, containerName: string = 'reports') {
    this.connectionString = connectionString;
    this.containerName = containerName;
  }

  async storePdf(_fileName: string, _data: Buffer): Promise<string> {
    throw new Error('Azure Blob Storage not yet implemented');
  }

  async getPdf(_fileName: string): Promise<Buffer | null> {
    throw new Error('Azure Blob Storage not yet implemented');
  }

  async deletePdf(_fileName: string): Promise<void> {
    throw new Error('Azure Blob Storage not yet implemented');
  }

  async exists(_fileName: string): Promise<boolean> {
    throw new Error('Azure Blob Storage not yet implemented');
  }

  async getPublicUrl(_fileName: string, _expiresInSeconds?: number): Promise<string> {
    throw new Error('Azure Blob Storage not yet implemented');
  }
}
