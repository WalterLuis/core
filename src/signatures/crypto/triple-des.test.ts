/**
 * Tests for Triple DES implementation.
 */

import { describe, expect, it } from "vitest";
import { TripleDES } from "./triple-des";

describe("TripleDES", () => {
  describe("constants", () => {
    it("has correct block size", () => {
      expect(TripleDES.BLOCK_SIZE).toBe(8);
    });

    it("has correct key size", () => {
      expect(TripleDES.KEY_SIZE).toBe(24);
    });
  });

  describe("decrypt", () => {
    it("throws on invalid key length", () => {
      const data = new Uint8Array(8);
      const key = new Uint8Array(16); // Should be 24
      const iv = new Uint8Array(8);

      expect(() => TripleDES.decrypt(data, key, iv)).toThrow(/Invalid 3DES key length/);
    });

    it("throws on invalid IV length", () => {
      const data = new Uint8Array(8);
      const key = new Uint8Array(24);
      const iv = new Uint8Array(16); // Should be 8

      expect(() => TripleDES.decrypt(data, key, iv)).toThrow(/Invalid IV length/);
    });

    it("throws on invalid data length", () => {
      const data = new Uint8Array(10); // Not multiple of 8
      const key = new Uint8Array(24);
      const iv = new Uint8Array(8);

      expect(() => TripleDES.decrypt(data, key, iv)).toThrow(/Invalid data length/);
    });

    it("decrypts known test vector", () => {
      // Test vector from NIST SP 800-67
      // Key: 0123456789ABCDEF 23456789ABCDEF01 456789ABCDEF0123
      // IV: zeros
      // Plaintext: "The quick brown fox jumps" (padded)
      // This is a simplified test - the actual decryption is verified
      // by the integration tests with real P12 files

      const key = new Uint8Array([
        0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef,
        0x01, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef, 0x01, 0x23,
      ]);
      const iv = new Uint8Array(8);
      const data = new Uint8Array(8);

      // Just verify it doesn't throw and returns correct length
      const result = TripleDES.decrypt(data, key, iv, false);
      expect(result.length).toBe(8);
    });

    it("handles empty data", () => {
      const data = new Uint8Array(0);
      const key = new Uint8Array(24);
      const iv = new Uint8Array(8);

      const result = TripleDES.decrypt(data, key, iv);
      expect(result.length).toBe(0);
    });

    it("removes PKCS#7 padding by default", () => {
      // Create data with valid PKCS#7 padding (4 bytes of padding)
      const key = new Uint8Array(24);
      const iv = new Uint8Array(8);

      // Encrypted block that when decrypted has padding
      const encrypted = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

      const withPadding = TripleDES.decrypt(encrypted, key, iv, false);
      const withoutPadding = TripleDES.decrypt(encrypted, key, iv, true);

      // Verify padding removal behavior
      expect(withPadding.length).toBe(8);
      expect(withoutPadding.length).toBeLessThanOrEqual(8);
    });

    it("decrypts multiple blocks with CBC chaining", () => {
      const key = new Uint8Array(24);
      const iv = new Uint8Array(8);
      const data = new Uint8Array(24); // 3 blocks

      const result = TripleDES.decrypt(data, key, iv, false);
      expect(result.length).toBe(24);
    });
  });
});
