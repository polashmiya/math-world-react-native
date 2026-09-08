/**
 * Stable identifier helpers (spec §9: never use array indexes as IDs).
 * `uuid` produces an RFC-4122 v4 shaped string from a plain PRNG so it works in
 * every runtime the app targets (Hermes has no global `crypto.randomUUID`).
 */
const HEX = '0123456789abcdef';

export function uuid(rand: () => number = Math.random): string {
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4';
    } else if (i === 19) {
      out += HEX[(Math.floor(rand() * 16) & 0x3) | 0x8];
    } else {
      out += HEX[Math.floor(rand() * 16)];
    }
  }
  return out;
}

/**
 * Deterministic, human-debuggable id for generated content.
 * The same generator + same parameters always produce the same id, which keeps
 * attempts and mistakes joinable across sessions without persisting the question.
 */
export function deterministicId(namespace: string, ...parts: (string | number)[]): string {
  return namespace + ':' + parts.join('_');
}

/** Non-cryptographic 32-bit string hash (FNV-1a). Used for seeding PRNGs. */
export function hashString(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
