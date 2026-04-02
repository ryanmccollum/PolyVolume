import { credentials } from './config';
import { sign } from '@noble/ed25519';

const missing = [];
if (!credentials.privateKey) missing.push('PRIVATE_KEY');
if (!credentials.apiKeyId) missing.push('POLY_API_KEY');
if (missing.length) {
  throw new Error(`Missing environment variables: ${missing.join(', ')}`);
}

const privateKeyBytes = Buffer.from(credentials.privateKey, 'base64');
if (![32, 64].includes(privateKeyBytes.length)) {
  throw new Error('PRIVATE_KEY must be a base64-encoded 32- or 64-byte Ed25519 key.');
}

export async function buildAuthHeaders(method: string, path: string) {
  const timestamp = Date.now().toString();
  const payload = `${timestamp}${method}${path}`;
  const signatureBytes = await sign(new TextEncoder().encode(payload), privateKeyBytes);
  return {
    'Content-Type': 'application/json',
    'X-PM-Access-Key': credentials.apiKeyId,
    'X-PM-Timestamp': timestamp,
    'X-PM-Signature': Buffer.from(signatureBytes).toString('base64'),
  };
}
