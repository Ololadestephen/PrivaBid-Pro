'use client';

import { ethers } from 'ethers';

let fheInstance: any = null;
let fheSdkVersion: string | null = null;


export async function initializeFhevm(provider: any) {
  if (typeof window === 'undefined') return null; // server guard

  if (fheInstance) return fheInstance;

  try {
    const sdk = await import('@fhevm/sdk');

    // try common exported names
    const FhevmClass = sdk?.Fhevm || sdk?.FhevmClient || sdk?.default || sdk?.FhevmSDK || sdk?.Client;
    if (!FhevmClass) {
      // store sdk object for debugging
      console.warn('@fhevm/sdk loaded but no recognized export found', Object.keys(sdk || {}));
      throw new Error('Unsupported @fhevm/sdk build (no known export).');
    }

    // instantiate — many SDKs accept an options object with provider.
    try {
      fheInstance = new FhevmClass({ provider });
    } catch (err) {
      // fallback: maybe it expects provider directly
      try {
        fheInstance = new FhevmClass(provider);
      } catch (err2) {
        console.error('Unable to construct @fhevm/sdk client with provider', err, err2);
        throw new Error('FHE SDK instantiation failed');
      }
    }

    // optionally keep version if available
    fheSdkVersion = (sdk && (sdk.version || sdk.VERSION || sdk.SEMVER)) || null;

    console.info('[lib/fhevm] FHE SDK initialized', { fheSdkVersion });
    return fheInstance;
  } catch (err) {
    console.error('[lib/fhevm] initializeFhevm error:', err);
    throw err;
  }
}

/**
 * encryptBid(amount)
 * - Attempts to call likely encryption methods on the SDK instance.
 * - Returns a normalized object: { data: '0x...', proof: '0x...' }
 *
 * Note: the contract expects both an encrypted value (externalEuint32 / bytes32) and a proof (bytes).
 * If the SDK returns only ciphertext and no proof, we return proof = '0x' and the UI code will NOT call
 * submitEncryptedBid (it will fall back to submitSimpleBid). That's intentional to avoid contract revert.
 */
export async function encryptBid(amount: number) {
  if (!fheInstance) throw new Error('FHE not initialized (call initializeFhevm first)');

  // Try a set of possible methods in order (SDKs vary).
  const tries = [
    'encrypt', // common
    'encryptAmount',
    'encryptUint32',
    'encrypt_euint32',
    'createEncryptedValue',
    'seal', // generic name
    'encryptValue',
  ];

  let encrypted: any = null;

  for (const m of tries) {
    if (typeof fheInstance[m] === 'function') {
      try {
        encrypted = await fheInstance[m](amount);
        if (encrypted) break;
      } catch (err) {
        console.warn(`[lib/fhevm] method ${m} failed:`, err);
      }
    }
  }

  // Some SDKs expose a helper under 'fhenix' or 'client' property
  if (!encrypted) {
    if (fheInstance?.fhenix && typeof fheInstance.fhenix.encrypt === 'function') {
      try {
        encrypted = await fheInstance.fhenix.encrypt(amount);
      } catch (err) {
        console.warn('[lib/fhevm] fhenix.encrypt failed:', err);
      }
    }
  }

  if (!encrypted) {
    // try an SDK "encrypt" that requires options; last-resort attempt
    if (typeof (fheInstance as any).encrypt === 'function') {
      try {
        encrypted = await (fheInstance as any).encrypt(amount);
      } catch (err) {
        console.warn('[lib/fhevm] last-resort encrypt failed', err);
      }
    }
  }

  if (!encrypted) {
    throw new Error('Encryption failed or SDK did not return ciphertext');
  }

  // Normalize shape: make { data, proof }
  // Common shapes:
  // - string (hex) -> ciphertext only
  // - Uint8Array -> ciphertext only
  // - { ciphertext: hex, proof: hex } or { data, proof } or { data: Uint8Array, proof: Uint8Array }
  let dataHex: string | null = null;
  let proofHex: string = '0x';

  if (typeof encrypted === 'string') {
    dataHex = encrypted.startsWith('0x') ? encrypted : '0x' + encrypted;
  } else if (encrypted instanceof Uint8Array || ArrayBuffer.isView(encrypted)) {
    dataHex = ethers.hexlify(encrypted);
  } else if (typeof encrypted === 'object') {
    // several possible field names
    const rawData = encrypted.data ?? encrypted.ciphertext ?? encrypted.ct ?? encrypted.encrypted ?? encrypted.cipher;
    const rawProof = encrypted.proof ?? encrypted.inputProof ?? encrypted.proofBytes ?? encrypted.proof_hex;

    if (rawData) {
      dataHex = typeof rawData === 'string' ? (rawData.startsWith('0x') ? rawData : '0x' + rawData) : ethers.hexlify(rawData);
    }
    if (rawProof) {
      proofHex = typeof rawProof === 'string' ? (rawProof.startsWith('0x') ? rawProof : '0x' + rawProof) : ethers.hexlify(rawProof);
    }
  }

  if (!dataHex) {
    throw new Error('Encryption returned an unrecognized format (no ciphertext)');
  }

  // The on-chain contract expects a 32-byte externalEuint32. If the ciphertext is longer than 32 bytes,
  // do NOT silently truncate — the correct approach is to rely on proof generation from the SDK.
  // However, we make a best-effort normalization to 32 bytes IF the ciphertext is larger and no proof exists.
  // WARNING: this is imperfect — prefer SDK that emits an accompanying proof.
  if (dataHex.length > 66 && proofHex === '0x') {
    // best-effort: keccak -> 32 bytes (this will not create a valid FHE proof, so encrypted submissions will be skipped)
    console.warn('[lib/fhevm] ciphertext > 32 bytes and no proof present — computing keccak256 fallback (NOT cryptographically equivalent)');
    dataHex = ethers.keccak256(dataHex);
  }

  if (dataHex.length < 66) {
    // left-pad to 32 bytes
    dataHex = ethers.hexZeroPad(dataHex, 32);
  }

  return { data: dataHex, proof: proofHex };
}

/**
 * generateToken(provider, account) - fallback implementation
 * - Many SDKs require a permission token from the frontend; if the SDK provides token generation we call it,
 *   otherwise we fallback to signing a short message with the user's wallet which can be used as an auth token.
 */
export async function generateToken(provider: any, account: string) {
  // If SDK exposes a method, prefer that
  try {
    if (fheInstance && typeof fheInstance.generateToken === 'function') {
      return await fheInstance.generateToken(account);
    }
    if (fheInstance && typeof fheInstance.getToken === 'function') {
      return await fheInstance.getToken(account);
    }
  } catch (err) {
    console.warn('[lib/fhevm] SDK token generation failed (falling back to signed message):', err);
  }

  // fallback: sign a message with wallet (non-SDK token)
  try {
    const signer = provider.getSigner ? provider.getSigner() : null;
    if (!signer) {
      // provider may be BrowserProvider; getSigner() returns a Promise-compatible object on ethers v6
      const fallbackSigner = (provider as any).getSigner ? (await (provider as any).getSigner()) : null;
      if (!fallbackSigner) throw new Error('Could not get signer for token generation');
      const message = `PrivaBid token:${account}:${Date.now()}`;
      return await fallbackSigner.signMessage(message);
    }
    const message = `PrivaBid token:${account}:${Date.now()}`;
    return await (await signer).signMessage(message);
  } catch (err) {
    console.warn('[lib/fhevm] fallback generateToken signing failed:', err);
    throw new Error('Token generation failed');
  }
}
