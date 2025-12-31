/**
 * Office SSO Authentication Service
 * Uses OfficeRuntime.auth.getAccessToken to obtain an access token from Office
 */

/// <reference types="office-js" />
/// <reference types="office-runtime" />

export interface SsoTokenResult {
  success: true;
  token: string;
  expiresOn?: Date;
}

export interface SsoTokenError {
  success: false;
  error: string;
  errorCode?: string;
  needsConsent?: boolean;
  needsInteraction?: boolean;
}

export type SsoResult = SsoTokenResult | SsoTokenError;

/**
 * Get an Office SSO access token
 * @param forceRefresh - Force a new token even if cached
 * @returns Promise with token or error details
 */
export async function getOfficeSsoToken(
  forceRefresh: boolean = false
): Promise<SsoResult> {
  try {
    // Check if Office is available
    if (typeof Office === 'undefined' || !Office.context || !Office.auth) {
      return {
        success: false,
        error: 'Office context not available. Not running in Office add-in.',
        errorCode: 'OFFICE_NOT_AVAILABLE'
      };
    }

    console.log('[Office SSO] Requesting access token...');
    
    const options: Office.AuthOptions = {
      allowSignInPrompt: true,
      allowConsentPrompt: true,
      forMSGraphAccess: false // Set to true if you need Graph scopes in the token
    };

    if (forceRefresh) {
      (options as any).forceRefresh = true;
    }

    // Use Office.auth.getAccessToken for Outlook Web compatibility
    const token = await Office.auth.getAccessToken(options);
    
    console.log('[Office SSO] Token acquired successfully');
    
    // Decode token to get expiration (basic JWT parsing, no validation)
    const payload = parseJwtPayload(token);
    const expiresOn = payload?.exp ? new Date(payload.exp * 1000) : undefined;

    return {
      success: true,
      token,
      expiresOn
    };

  } catch (error: any) {
    console.error('[Office SSO] Error getting token:', error);

    const errorCode = error.code?.toString() || 'UNKNOWN';
    const errorMessage = error.message || 'Failed to get access token';

    // Handle specific error codes
    // https://learn.microsoft.com/en-us/office/dev/add-ins/develop/troubleshoot-sso-in-office-add-ins
    
    if (errorCode === '13001') {
      // User not signed into Office
      return {
        success: false,
        error: 'Please sign in to Office to continue.',
        errorCode: 'USER_NOT_SIGNED_IN',
        needsInteraction: true
      };
    }

    if (errorCode === '13002') {
      // User aborted consent prompt
      return {
        success: false,
        error: 'You must grant consent to continue.',
        errorCode: 'USER_ABORTED',
        needsConsent: true
      };
    }

    if (errorCode === '13003') {
      // User type not supported (e.g., Microsoft account instead of work/school)
      return {
        success: false,
        error: 'This add-in requires a work or school account.',
        errorCode: 'UNSUPPORTED_USER_TYPE'
      };
    }

    if (errorCode === '13004') {
      // Resource (app) is not configured properly
      return {
        success: false,
        error: 'The add-in is not properly configured. Please contact support.',
        errorCode: 'INVALID_RESOURCE',
        needsConsent: true
      };
    }

    if (errorCode === '13005') {
      // Invalid grant (usually means consent not granted)
      return {
        success: false,
        error: 'Administrator consent required. Please contact your IT admin.',
        errorCode: 'INVALID_GRANT',
        needsConsent: true
      };
    }

    if (errorCode === '13006') {
      // Client ID mismatch
      return {
        success: false,
        error: 'Configuration error. Please contact support.',
        errorCode: 'CLIENT_ID_MISMATCH'
      };
    }

    if (errorCode === '13007') {
      // No cached token and allowSignInPrompt was false
      return {
        success: false,
        error: 'Authentication required.',
        errorCode: 'NO_CACHED_TOKEN',
        needsInteraction: true
      };
    }

    if (errorCode === '13012') {
      // Network error
      return {
        success: false,
        error: 'Network error. Please check your connection and try again.',
        errorCode: 'NETWORK_ERROR'
      };
    }

    return {
      success: false,
      error: errorMessage,
      errorCode
    };
  }
}

/**
 * Parse JWT payload without validation (for reading claims like exp, oid, etc.)
 * WARNING: Do NOT use this for security validation - tokens must be validated on the server
 */
function parseJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('[Office SSO] Failed to parse JWT payload:', e);
    return null;
  }
}

/**
 * Get basic user info from the token (client-side only, not validated)
 * For production use, always validate tokens on the server
 */
export function getUserInfoFromToken(token: string): {
  name?: string;
  email?: string;
  oid?: string;
  tid?: string;
} | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;

  return {
    name: payload.name,
    email: payload.preferred_username || payload.upn || payload.email,
    oid: payload.oid,
    tid: payload.tid
  };
}
