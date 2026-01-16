/**
 * Tests for PEM encoding/decoding utilities.
 */

import { describe, expect, it } from "vitest";

import { derToPem, getPemLabel, isPem, normalizePem, pemToDer } from "./pem";

describe("PEM utilities", () => {
  // Sample DER data (just random bytes for testing)
  const sampleDer = new Uint8Array([0x30, 0x82, 0x01, 0x22, 0x30, 0x0d, 0x06, 0x09]);

  describe("derToPem", () => {
    it("converts DER to PEM with correct header/footer", () => {
      const pem = derToPem(sampleDer, "CERTIFICATE");

      expect(pem).toContain("-----BEGIN CERTIFICATE-----");
      expect(pem).toContain("-----END CERTIFICATE-----");
    });

    it("produces valid base64 content", () => {
      const pem = derToPem(sampleDer, "PUBLIC KEY");

      // Extract base64 content
      const base64 = pem
        .replace(/-----BEGIN PUBLIC KEY-----/, "")
        .replace(/-----END PUBLIC KEY-----/, "")
        .replace(/\s/g, "");

      // Should decode without error
      const decoded = atob(base64);
      expect(decoded.length).toBe(sampleDer.length);
    });

    it("wraps lines at 64 characters", () => {
      // Create larger data to force multiple lines
      const largeDer = new Uint8Array(100);
      for (let i = 0; i < largeDer.length; i++) {
        largeDer[i] = i % 256;
      }

      const pem = derToPem(largeDer, "CERTIFICATE");
      const lines = pem.split("\n");

      // Check content lines (skip header/footer)
      for (let i = 1; i < lines.length - 2; i++) {
        expect(lines[i].length).toBeLessThanOrEqual(64);
      }
    });

    it("handles empty data", () => {
      const pem = derToPem(new Uint8Array(0), "CERTIFICATE");

      expect(pem).toContain("-----BEGIN CERTIFICATE-----");
      expect(pem).toContain("-----END CERTIFICATE-----");
    });
  });

  describe("pemToDer", () => {
    it("converts PEM back to original DER", () => {
      const pem = derToPem(sampleDer, "CERTIFICATE");
      const der = pemToDer(pem);

      expect(der).toEqual(sampleDer);
    });

    it("handles PEM with different line lengths", () => {
      // Create PEM with irregular line lengths
      const base64 = btoa(String.fromCharCode(...sampleDer));
      const pem = `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----`;

      const der = pemToDer(pem);
      expect(der).toEqual(sampleDer);
    });

    it("handles PEM with extra whitespace", () => {
      const base64 = btoa(String.fromCharCode(...sampleDer));
      const pem = `-----BEGIN CERTIFICATE-----\n\n  ${base64}  \n\n-----END CERTIFICATE-----\n`;

      const der = pemToDer(pem);
      expect(der).toEqual(sampleDer);
    });

    it("handles different labels", () => {
      const labels = ["CERTIFICATE", "PUBLIC KEY", "PRIVATE KEY", "RSA PRIVATE KEY"];

      for (const label of labels) {
        const pem = derToPem(sampleDer, label);
        const der = pemToDer(pem);
        expect(der).toEqual(sampleDer);
      }
    });
  });

  describe("getPemLabel", () => {
    it("extracts CERTIFICATE label", () => {
      const pem = derToPem(sampleDer, "CERTIFICATE");
      expect(getPemLabel(pem)).toBe("CERTIFICATE");
    });

    it("extracts PUBLIC KEY label", () => {
      const pem = derToPem(sampleDer, "PUBLIC KEY");
      expect(getPemLabel(pem)).toBe("PUBLIC KEY");
    });

    it("extracts PRIVATE KEY label", () => {
      const pem = derToPem(sampleDer, "PRIVATE KEY");
      expect(getPemLabel(pem)).toBe("PRIVATE KEY");
    });

    it("returns null for non-PEM string", () => {
      expect(getPemLabel("not a pem")).toBeNull();
    });
  });

  describe("isPem", () => {
    it("returns true for valid PEM", () => {
      const pem = derToPem(sampleDer, "CERTIFICATE");
      expect(isPem(pem)).toBe(true);
    });

    it("returns false for non-PEM string", () => {
      expect(isPem("not a pem")).toBe(false);
    });

    it("returns false for partial PEM (header only)", () => {
      expect(isPem("-----BEGIN CERTIFICATE-----")).toBe(false);
    });

    it("returns false for partial PEM (footer only)", () => {
      expect(isPem("-----END CERTIFICATE-----")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(isPem("")).toBe(false);
    });
  });

  describe("normalizePem", () => {
    it("removes headers and footers", () => {
      const pem = derToPem(sampleDer, "CERTIFICATE");
      const normalized = normalizePem(pem);

      expect(normalized).not.toContain("-----BEGIN");
      expect(normalized).not.toContain("-----END");
    });

    it("removes all whitespace", () => {
      const pem = derToPem(sampleDer, "CERTIFICATE");
      const normalized = normalizePem(pem);

      expect(normalized).not.toContain("\n");
      expect(normalized).not.toContain(" ");
    });

    it("produces same result for equivalent PEMs with different formatting", () => {
      const base64 = btoa(String.fromCharCode(...sampleDer));

      // Different formatting styles
      const pem1 = `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----`;
      const pem2 = `-----BEGIN CERTIFICATE-----\n${base64.match(/.{1,64}/g)?.join("\n")}\n-----END CERTIFICATE-----`;

      expect(normalizePem(pem1)).toBe(normalizePem(pem2));
    });
  });

  describe("round-trip", () => {
    it("preserves data through multiple round-trips", () => {
      let data: Uint8Array = sampleDer;

      for (let i = 0; i < 3; i++) {
        const pem = derToPem(data, "CERTIFICATE");
        data = pemToDer(pem);
      }

      expect(data).toEqual(sampleDer);
    });

    it("works with larger binary data", () => {
      const largeDer = new Uint8Array(1000);

      for (let i = 0; i < largeDer.length; i++) {
        largeDer[i] = Math.floor(Math.random() * 256);
      }

      const pem = derToPem(largeDer, "CERTIFICATE");
      const result = pemToDer(pem);

      expect(result).toEqual(largeDer);
    });
  });
});
