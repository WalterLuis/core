/**
 * PDF string encoding utilities.
 */

import { CHAR_BACKSLASH, CHAR_PARENTHESIS_CLOSE, CHAR_PARENTHESIS_OPEN } from "./chars";

/**
 * Escape a PDF literal string for serialization.
 *
 * Handles:
 * - Backslash escaping for \, (, )
 * - Other bytes pass through unchanged
 *
 * @param bytes - Raw string bytes
 * @returns Escaped bytes safe for literal string output
 */
export function escapeLiteralString(bytes: Uint8Array): Uint8Array {
  // Pre-scan to count bytes needing escape
  let escapeCount = 0;

  for (const byte of bytes) {
    if (
      byte === CHAR_BACKSLASH ||
      byte === CHAR_PARENTHESIS_OPEN ||
      byte === CHAR_PARENTHESIS_CLOSE
    ) {
      escapeCount++;
    }
  }

  if (escapeCount === 0) {
    return bytes;
  }

  const result = new Uint8Array(bytes.length + escapeCount);
  let j = 0;

  for (const byte of bytes) {
    if (byte === CHAR_BACKSLASH) {
      result[j++] = CHAR_BACKSLASH;
      result[j++] = CHAR_BACKSLASH;
    } else if (byte === CHAR_PARENTHESIS_OPEN) {
      result[j++] = CHAR_BACKSLASH;
      result[j++] = CHAR_PARENTHESIS_OPEN;
    } else if (byte === CHAR_PARENTHESIS_CLOSE) {
      result[j++] = CHAR_BACKSLASH;
      result[j++] = CHAR_PARENTHESIS_CLOSE;
    } else {
      result[j++] = byte;
    }
  }

  return result;
}

/**
 * Convert bytes to uppercase hex string.
 *
 * @param bytes - Raw bytes
 * @returns Hex string (e.g., "48656C6C6F")
 *
 * @example
 * ```ts
 * bytesToHex(new Uint8Array([72, 101, 108, 108, 111])) // "48656C6C6F"
 * ```
 */
export function bytesToHex(bytes: Uint8Array): string {
  let hex = "";

  for (const byte of bytes) {
    hex += byte.toString(16).toUpperCase().padStart(2, "0");
  }

  return hex;
}

/**
 * Convert a hex string to bytes.
 *
 * Whitespace is ignored. Odd-length strings are padded with trailing 0.
 *
 * @param hex - Hex string (e.g., "48656C6C6F" or "48 65 6C 6C 6F")
 * @returns Decoded bytes
 *
 * @example
 * ```ts
 * hexToBytes("48656C6C6F") // Uint8Array([72, 101, 108, 108, 111])
 * hexToBytes("ABC") // Uint8Array([171, 192]) - padded to "ABC0"
 * ```
 */
export function hexToBytes(hex: string): Uint8Array {
  // Remove whitespace
  const clean = hex.replace(/\s/g, "");

  // Pad odd-length with trailing 0
  const padded = clean.length % 2 === 1 ? `${clean}0` : clean;

  const bytes = new Uint8Array(padded.length / 2);

  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Number.parseInt(padded.slice(i * 2, i * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Generate a unique name by appending a number to a prefix.
 *
 * Finds the first available name by incrementing a counter until a name
 * that doesn't exist in the provided set is found.
 *
 * @param existingNames - Set of names that already exist
 * @param prefix - Prefix to use (e.g., "Signature_" or "DocTimeStamp_")
 * @returns A unique name that doesn't exist in the set
 *
 * @example
 * ```ts
 * const names = new Set(["Signature_1", "Signature_2"]);
 * generateUniqueName(names, "Signature_") // "Signature_3"
 * ```
 */
export function generateUniqueName(existingNames: Set<string>, prefix: string): string {
  let n = 1;

  while (existingNames.has(`${prefix}${n}`)) {
    n++;
  }

  return `${prefix}${n}`;
}
