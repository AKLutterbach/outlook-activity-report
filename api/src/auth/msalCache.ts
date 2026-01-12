import * as msal from '@azure/msal-node';
import { encryptToken as encrypt, decryptToken as decrypt } from '../utils/tokenEncryption';
import { UserTokenRepository } from '../db/repositories';
import { CosmosDbClient } from '../db/cosmosClient';

const cosmosDbClient = new CosmosDbClient({
  endpoint: process.env.COSMOS_ENDPOINT!,
  key: process.env.COSMOS_KEY!,
  databaseId: process.env.COSMOS_DATABASE || 'outlookweekly'
});
const userTokenRepository = new UserTokenRepository(cosmosDbClient);

const ENCRYPTION_SECRET = process.env.ENCRYPTION_KEY || 'dev-encryption-key-32-bytes-long!';

export interface MsalCacheData {
  tenantId: string;
  userId: string;
  encryptedCache: string;
  updatedAt: Date;
}

export async function loadMsalCache(tenantId: string, userId: string): Promise<msal.TokenCache | null> {
  try {
    const record = await userTokenRepository.findByTenantAndUser(tenantId, userId);
    
    if (!record || !record.msalCacheEncrypted) {
      return null;
    }
    
    const decrypted = decrypt(record.msalCacheEncrypted, ENCRYPTION_SECRET);
    const tokenCache = new msal.TokenCache();
    tokenCache.deserialize(decrypted);
    
    return tokenCache;
  } catch (err) {
    console.error('Failed to load MSAL cache:', err);
    return null;
  }
}

export async function saveMsalCache(
  tenantId: string, 
  userId: string, 
  tokenCache: msal.TokenCache
): Promise<void> {
  const serialized = tokenCache.serialize();
  const encrypted = encrypt(serialized, ENCRYPTION_SECRET);
  
  await userTokenRepository.upsertToken(tenantId, userId, {
    msalCacheEncrypted: encrypted,
    updatedAt: new Date()
  });
}

export function createMsalClient(tenantId: string, tokenCache?: msal.TokenCache): msal.ConfidentialClientApplication {
  const config: msal.Configuration = {
    auth: {
      clientId: process.env.ENTRA_CLIENT_ID!,
      clientSecret: process.env.ENTRA_CLIENT_SECRET!,
      authority: `https://login.microsoftonline.com/${tenantId}`
    },
    system: {
      loggerOptions: {
        loggerCallback: (_level, message, containsPii) => {
          if (containsPii) return;
          console.log(message);
        },
        piiLoggingEnabled: false,
        logLevel: msal.LogLevel.Warning
      }
    }
  };
  
  if (tokenCache) {
    config.cache = {
      cachePlugin: {
        beforeCacheAccess: async (_context) => {
          // Cache already loaded
        },
        afterCacheAccess: async (_context) => {
          // Will be saved explicitly after acquireToken calls
        }
      }
    };
  }
  
  return new msal.ConfidentialClientApplication(config);
}
