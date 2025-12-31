/**
 * Storage interface for PDF files
 * Provides abstraction for local and cloud storage
 */
export interface BlobStorageClient {
  /**
   * Store a PDF file
   * @param fileName - Name/key for the file
   * @param data - PDF data as Buffer
   * @returns URL or path to access the file
   */
  storePdf(fileName: string, data: Buffer): Promise<string>;

  /**
   * Retrieve a PDF file
   * @param fileName - Name/key of the file
   * @returns PDF data as Buffer, or null if not found
   */
  getPdf(fileName: string): Promise<Buffer | null>;

  /**
   * Delete a PDF file
   * @param fileName - Name/key of the file
   */
  deletePdf(fileName: string): Promise<void>;

  /**
   * Check if a PDF file exists
   * @param fileName - Name/key of the file
   */
  exists(fileName: string): Promise<boolean>;

  /**
   * Get a publicly accessible URL for the PDF
   * @param fileName - Name/key of the file
   * @param expiresInSeconds - How long the URL should be valid (for cloud storage)
   */
  getPublicUrl(fileName: string, expiresInSeconds?: number): Promise<string>;
}
