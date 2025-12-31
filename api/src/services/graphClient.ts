import { Client } from '@microsoft/microsoft-graph-client';
import { UserTokenRepository } from '../db';
import { decryptToken } from '../utils/tokenEncryption';

const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface CachedToken {
  accessToken: string;
  expiresAt: number; // timestamp
}

// In-memory cache for access tokens (expires before actual expiry)
const tokenCache = new Map<string, CachedToken>();

/**
 * Get a Microsoft Graph client for a user
 * Handles token refresh automatically
 */
export async function getGraphClient(
  userId: string,
  tokenRepo: UserTokenRepository
): Promise<Client> {
  const accessToken = await getAccessToken(userId, tokenRepo);

  return Client.init({
    authProvider: (done) => {
      done(null, accessToken);
    },
  });
}

/**
 * Get a valid access token for a user
 * Uses cached token if available and not expired, otherwise refreshes
 */
async function getAccessToken(
  userId: string,
  tokenRepo: UserTokenRepository
): Promise<string> {
  // Check cache first
  const cached = tokenCache.get(userId);
  if (cached && cached.expiresAt > Date.now() + 60000) {
    // Token valid for at least 1 more minute
    return cached.accessToken;
  }

  // Need to refresh token
  const userToken = await tokenRepo.getLatestForUser(userId);
  if (!userToken) {
    throw new Error('User token not found. User needs to re-authenticate.');
  }

  // Decrypt refresh token
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error('ENCRYPTION_SECRET not configured');
  }
  const refreshToken = decryptToken(userToken.encryptedRefreshToken, secret);

  // Exchange refresh token for new access token
  const tokenResponse = await refreshAccessToken(refreshToken);

  // Cache the new access token (with 5 minute buffer before expiry)
  const expiresAt = Date.now() + (tokenResponse.expires_in - 300) * 1000;
  tokenCache.set(userId, {
    accessToken: tokenResponse.access_token,
    expiresAt,
  });

  // If a new refresh token was returned, update it in storage
  if (tokenResponse.refresh_token) {
    // This is not typical for Microsoft tokens, but handle it just in case
    const encryptToken = (await import('../utils/tokenEncryption')).encryptToken;
    const secret = process.env.ENCRYPTION_SECRET!;
    const newEncryptedRefreshToken = encryptToken(tokenResponse.refresh_token, secret);
    await tokenRepo.update(userToken.id, userToken.userId, {
      encryptedRefreshToken: newEncryptedRefreshToken,
    });
  }

  return tokenResponse.access_token;
}

/**
 * Refresh an access token using a refresh token
 */
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Azure OAuth credentials not configured');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });

  try {
    const response = await fetch(MICROSOFT_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Token refresh failed: ${response.status} ${errorData}`);
    }

    const tokenData = await response.json() as TokenResponse;
    return tokenData;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw new Error('Failed to refresh access token. User needs to re-authenticate.');
  }
}

/**
 * Clear cached token for a user (useful when logging out or encountering auth errors)
 */
export function clearTokenCache(userId: string): void {
  tokenCache.delete(userId);
}
