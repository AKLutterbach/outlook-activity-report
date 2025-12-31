/**
 * API Client with Office SSO token authentication
 */

import { getOfficeSsoToken } from './officeSso';

const API_URL = process.env.REACT_APP_API_URL || 'https://localhost:3000';

export interface ApiResponse<T> {
  success: true;
  data: T;
}

export interface ApiError {
  success: false;
  error: string;
  statusCode?: number;
  needsReauth?: boolean;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;

/**
 * Make an authenticated API request using Office SSO token
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResult<T>> {
  try {
    // Get Office SSO token
    const tokenResult = await getOfficeSsoToken();
    
    if (!tokenResult.success) {
      return {
        success: false,
        error: tokenResult.error,
        needsReauth: tokenResult.needsInteraction || tokenResult.needsConsent
      };
    }

    // Make API request with token
    const url = `${API_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenResult.token}`,
        ...options.headers
      }
    });

    // Handle response
    if (!response.ok) {
      // Token might be expired or invalid
      if (response.status === 401) {
        return {
          success: false,
          error: 'Authentication failed. Please sign in again.',
          statusCode: 401,
          needsReauth: true
        };
      }

      const errorText = await response.text();
      return {
        success: false,
        error: errorText || `Request failed with status ${response.status}`,
        statusCode: response.status
      };
    }

    const data = await response.json();
    return {
      success: true,
      data
    };

  } catch (error: any) {
    console.error('[API Client] Request failed:', error);
    return {
      success: false,
      error: error.message || 'Network request failed'
    };
  }
}

/**
 * Exchange Office SSO token for app session token
 */
export async function exchangeToken(): Promise<ApiResult<{
  sessionToken: string;
  user: {
    id: string;
    email: string;
    name?: string;
  };
}>> {
  return apiRequest('/api/auth/exchange', {
    method: 'POST'
  });
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<ApiResult<{
  id: string;
  email: string;
  name?: string;
  tenantId: string;
}>> {
  return apiRequest('/api/me', {
    method: 'GET'
  });
}

/**
 * Get user settings
 */
export async function getUserSettings(): Promise<ApiResult<any>> {
  return apiRequest('/api/settings', {
    method: 'GET'
  });
}

/**
 * Save user settings
 */
export async function saveUserSettings(settings: any): Promise<ApiResult<any>> {
  return apiRequest('/api/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  });
}
