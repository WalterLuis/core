/**
 * Tests for RC2 implementation.
 */

import { describe, expect, it } from "vitest";
import { RC2 } from "./rc2";

describe("RC2", () => {
  describe("constants", () => {
    it("has correct block size", () => {
      expect(RC2.BLOCK_SIZE).toBe(8);
    });

    it("has correct effective bits constants", () => {
      expect(RC2.EFFECTIVE_BITS_40).toBe(40);
      expect(RC2.EFFECTIVE_BITS_64).toBe(64);
      expect(RC2.EFFECTIVE_BITS_128).toBe(128);
    });
  });

  describe("decrypt", () => {
    it("throws on invalid IV length", () => {
      const data = new Uint8Array(8);
      const key = new Uint8Array(16);
      const iv = new Uint8Array(16); // Should be 8

      expect(() => RC2.decrypt(data, key, iv, 128)).toThrow(/Invalid IV length/);
    });

    it("throws on invalid data length", () => {
      const data = new Uint8Array(10); // Not multiple of 8
      const key = new Uint8Array(16);
      const iv = new Uint8Array(8);

      expect(() => RC2.decrypt(data, key, iv, 128)).toThrow(/Invalid data length/);
    });

    it("handles empty data", () => {
      const data = new Uint8Array(0);
      const key = new Uint8Array(16);
      const iv = new Uint8Array(8);

      const result = RC2.decrypt(data, key, iv, 128);
      expect(result.length).toBe(0);
    });

    it("decrypts with 40-bit effective key", () => {
      const key = new Uint8Array(5); // 40 bits
      const iv = new Uint8Array(8);
      const data = new Uint8Array(8);

      const result = RC2.decrypt(data, key, iv, RC2.EFFECTIVE_BITS_40, false);
      expect(result.length).toBe(8);
    });

    it("decrypts with 128-bit effective key", () => {
      const key = new Uint8Array(16); // 128 bits
      const iv = new Uint8Array(8);
      const data = new Uint8Array(8);

      const result = RC2.decrypt(data, key, iv, RC2.EFFECTIVE_BITS_128, false);
      expect(result.length).toBe(8);
    });

    it("decrypts multiple blocks with CBC chaining", () => {
      const key = new Uint8Array(16);
      const iv = new Uint8Array(8);
      const data = new Uint8Array(24); // 3 blocks

      const result = RC2.decrypt(data, key, iv, 128, false);
      expect(result.length).toBe(24);
    });

    it("removes PKCS#7 padding by default", () => {
      const key = new Uint8Array(16);
      const iv = new Uint8Array(8);
      const encrypted = new Uint8Array(8);

      const withPadding = RC2.decrypt(encrypted, key, iv, 128, false);
      const withoutPadding = RC2.decrypt(encrypted, key, iv, 128, true);

      expect(withPadding.length).toBe(8);
      expect(withoutPadding.length).toBeLessThanOrEqual(8);
    });

    // RFC 2268 test vector
    it("decrypts RFC 2268 test vector", () => {
      // Test vector from RFC 2268 Section 5
      // Key = 00 00 00 00 00 00 00 00 (8 bytes)
      // Effective key bits = 63
      // Plaintext = 00 00 00 00 00 00 00 00
      // Ciphertext = EB B7 73 F9 93 27 8E FF

      const key = new Uint8Array(8);
      const ciphertext = new Uint8Array([0xeb, 0xb7, 0x73, 0xf9, 0x93, 0x27, 0x8e, 0xff]);
      const iv = new Uint8Array(8); // CBC with zero IV

      // Note: This tests ECB mode effectively since IV is zero and we have one block
      const result = RC2.decrypt(ciphertext, key, iv, 63, false);

      // Result XORed with IV (zeros) should give the plaintext
      expect(result).toEqual(new Uint8Array(8));
    });
  });
});
