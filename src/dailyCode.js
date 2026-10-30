// Daily proof code. The PC key tool and the phone share a secret (set once by scanning a pairing code).
// Each day the PC shows a code that only that secret can make for that date, so yesterday's code or a
// screenshot is useless today.
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

const CODE_PREFIX = 'CROWNWATCH|1|';
const PAIR_PREFIX = 'CROWNWATCH-PAIR|1|';

const mac = (secret, message) => bytesToHex(hmac(sha256, utf8ToBytes(secret), utf8ToBytes(message))).slice(0, 16);

export const makeDailyCode = (secret, dateKey) => `${CODE_PREFIX}${dateKey}|${mac(secret, CODE_PREFIX + dateKey)}`;
export const makePairCode = (secret) => `${PAIR_PREFIX}${secret}`;

export function parsePairCode(text) {
  if (typeof text !== 'string' || !text.startsWith(PAIR_PREFIX)) return null;
  const secret = text.slice(PAIR_PREFIX.length).trim();
  return /^[0-9a-f]{32}$/.test(secret) ? secret : null;
}

// Returns { ok, reason }. reason is one of: notcode, wrongday, invalid, nosecret
export function verifyDailyCode(text, secret, dateKey) {
  if (!secret) return { ok: false, reason: 'nosecret' };
  if (typeof text !== 'string' || !text.startsWith(CODE_PREFIX)) return { ok: false, reason: 'notcode' };
  const parts = text.split('|');
  if (parts.length !== 4) return { ok: false, reason: 'notcode' };
  const [, , day, given] = parts;
  if (mac(secret, CODE_PREFIX + day) !== given) return { ok: false, reason: 'invalid' };
  if (day !== dateKey) return { ok: false, reason: 'wrongday', day };
  return { ok: true };
}
