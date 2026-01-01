/**
 * API Client for Outlook Weekly backend
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export interface UserSettings {
  cadence: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
  outputMode: 'DRAFT_EMAIL_TO_SELF' | 'SEND_EMAIL_TO_SELF' | 'PDF_ONLY' | 'DRAFT_PLUS_PDF';
  dayOfWeek: number;
  timeOfDay: string;
  timezone: string;
  includeCalendar: boolean;
  includeSentMail: boolean;
  nextRunUtc?: string;
}

export interface ReportRun {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'ERROR';
  startedAt: string;
  completedAt?: string;
  reportWindowStart: string;
  reportWindowEnd: string;
  outputUrl?: string;
  draftMessageId?: string;
  errorMessage?: string;
}

export interface GenerateResponse {
  runId: string;
  status: string;
  message: string;
  draftMessageId?: string;
  errorMessage?: string;
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // Use cookie-based auth (credentials: 'include')
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Merge with any additional headers from options
    if (options.headers) {
      Object.assign(headers, options.headers);
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include' // Send cookies for session auth
    });

    // Handle authentication errors
    if (response.status === 401) {
      throw new AuthenticationError('Session expired. Please sign in again.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  }

  // Health check (no auth required)
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.request('/health');
  }

  // Settings (requires auth)
  async getSettings(): Promise<UserSettings> {
    return this.request('/me/settings');
  }

  async updateSettings(settings: UserSettings): Promise<UserSettings> {
    return this.request('/me/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Generate report (requires auth)
  async generateReport(): Promise<GenerateResponse> {
    return this.request('/me/generate', {
      method: 'POST',
    });
  }

  // Runs history (requires auth)
  async getRuns(limit: number = 10): Promise<{ runs: ReportRun[]; count: number }> {
    return this.request(`/me/runs?limit=${limit}`);
  }

  // PDF link (requires auth)
  async getPdfLink(runId: string): Promise<string> {
    return this.request(`/me/runs/${runId}/pdf-link`);
  }
}

export const apiClient = new ApiClient();
