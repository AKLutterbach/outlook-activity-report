export { BlobStorageClient } from './BlobStorageClient';
export { LocalStorageClient } from './LocalStorageClient';
export { AzureBlobStorageClient } from './AzureBlobStorageClient';

/**
 * Factory function to create storage client based on environment
 */
export function createStorageClient(): BlobStorageClient {
  const storageType = process.env.STORAGE_TYPE || 'local';

  if (storageType === 'azure') {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING not set');
    }
    return new AzureBlobStorageClient(connectionString);
  }

  // Default to local storage
  const storageDir = process.env.LOCAL_STORAGE_DIR || './tmp';
  return new LocalStorageClient(storageDir);
}
