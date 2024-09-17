import { sign } from 'jsonwebtoken';
import { generateKeyPairSync } from 'crypto';

// Generate a key pair as used by our real tokens
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 4096,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'pkcs1', format: 'pem' },
});

/**
 * Get a JWT token.
 */
export default (claims = {}) =>
  sign(claims, privateKey, { algorithm: 'RS256' });
