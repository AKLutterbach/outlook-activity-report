import crypto from 'crypto';

export interface PKCEChallenge {
  verifier: string;
  challenge: string;
}

export function generatePKCEChallenge(): PKCEChallenge {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  
  return { verifier, challenge };
}

export function generateState(): string {
  return crypto.randomBytes(16).toString('base64url');
}
