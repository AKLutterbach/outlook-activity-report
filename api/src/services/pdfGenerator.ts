import { chromium, Browser, Page } from 'playwright';

/**
 * PDF Generator Service
 * Converts HTML to PDF using Playwright Chromium
 */
export class PdfGenerator {
  private browser: Browser | null = null;

  /**
   * Initialize the browser instance
   */
  async initialize(): Promise<void> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless: true,
      });
    }
  }

  /**
   * Generate PDF from HTML string
   * @param html - HTML content to render
   * @param options - PDF generation options
   * @returns Buffer containing the PDF
   */
  async generatePdf(
    html: string,
    options?: {
      format?: 'Letter' | 'A4';
      margin?: { top?: string; right?: string; bottom?: string; left?: string };
      printBackground?: boolean;
    }
  ): Promise<Buffer> {
    await this.initialize();
    
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page: Page = await this.browser.newPage();
    
    try {
      // Set HTML content
      await page.setContent(html, { waitUntil: 'networkidle' });

      // Generate PDF
      const pdf = await page.pdf({
        format: options?.format || 'Letter',
        margin: options?.margin || {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        printBackground: options?.printBackground ?? true,
      });

      return pdf;
    } finally {
      await page.close();
    }
  }

  /**
   * Close the browser instance
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Singleton instance for reuse
let pdfGeneratorInstance: PdfGenerator | null = null;

/**
 * Get or create a singleton PDF generator instance
 */
export function getPdfGenerator(): PdfGenerator {
  if (!pdfGeneratorInstance) {
    pdfGeneratorInstance = new PdfGenerator();
  }
  return pdfGeneratorInstance;
}

/**
 * Cleanup function to close browser on process exit
 */
export async function closePdfGenerator(): Promise<void> {
  if (pdfGeneratorInstance) {
    await pdfGeneratorInstance.close();
    pdfGeneratorInstance = null;
  }
}
