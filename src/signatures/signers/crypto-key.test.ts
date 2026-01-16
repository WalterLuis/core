/**
 * Tests for CryptoKeySigner.
 *
 * These tests verify that CryptoKeySigner correctly signs data
 * by generating keys via WebCrypto and creating matching self-signed certificates.
 */

import { Integer, Utf8String } from "asn1js";
import * as pkijs from "pkijs";
import { describe, expect, it } from "vitest";

import { PDF } from "../../api/pdf";
import { loadFixture, saveTestOutput } from "../../test-utils";
import { CryptoKeySigner } from "./crypto-key";

const cryptoEngine = pkijs.getCrypto(true);

describe("CryptoKeySigner", () => {
  /**
   * Create a self-signed certificate for the given key pair.
   * This ensures the certificate's public key matches our private key.
   */
  async function createSelfSignedCertificate(
    keyPair: CryptoKeyPair,
    algorithm: "RSA" | "ECDSA",
  ): Promise<Uint8Array> {
    const certificate = new pkijs.Certificate();

    // Set version to v3 (value 2)
    certificate.version = 2;

    // Generate random serial number
    const serialNumber = new Uint8Array(8);
    crypto.getRandomValues(serialNumber);
    certificate.serialNumber = new Integer({ valueHex: serialNumber });

    // Set issuer and subject (self-signed, so they're the same)
    certificate.issuer.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: "2.5.4.3", // CN (Common Name)
        value: new Utf8String({ value: "Test Signer" }),
      }),
    );
    certificate.subject.typesAndValues.push(
      new pkijs.AttributeTypeAndValue({
        type: "2.5.4.3",
        value: new Utf8String({ value: "Test Signer" }),
      }),
    );

    // Set validity period (1 year)
    certificate.notBefore.value = new Date();
    certificate.notAfter.value = new Date();
    certificate.notAfter.value.setFullYear(certificate.notAfter.value.getFullYear() + 1);

    // Import the public key into the certificate
    await certificate.subjectPublicKeyInfo.importKey(keyPair.publicKey);

    // Sign the certificate with the private key (pkijs handles the algorithm internally)
    await certificate.sign(keyPair.privateKey, "SHA-256");

    // Export to DER
    const certDer = certificate.toSchema().toBER(false);

    return new Uint8Array(certDer);
  }

  /**
   * Helper to create a CryptoKeySigner with a matching key pair and certificate.
   */
  async function createTestSigner(algorithm: "RSA" | "ECDSA" = "RSA") {
    let keyPair: CryptoKeyPair;

    if (algorithm === "RSA") {
      keyPair = await cryptoEngine.generateKey(
        {
          name: "RSASSA-PKCS1-v1_5",
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: "SHA-256",
        },
        true,
        ["sign", "verify"],
      );
    } else {
      keyPair = await cryptoEngine.generateKey(
        {
          name: "ECDSA",
          namedCurve: "P-256",
        },
        true,
        ["sign", "verify"],
      );
    }

    // Create a self-signed certificate that matches the key pair
    const certificate = await createSelfSignedCertificate(keyPair, algorithm);

    return new CryptoKeySigner(
      keyPair.privateKey,
      certificate,
      algorithm === "RSA" ? "RSA" : "EC",
      algorithm === "RSA" ? "RSASSA-PKCS1-v1_5" : "ECDSA",
    );
  }
  describe("RSA signing", () => {
    it("signs data with RSA key", async () => {
      const signer = await createTestSigner("RSA");
      const testData = new TextEncoder().encode("Hello, World!");

      const signature = await signer.sign(testData, "SHA-256");

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
      // RSA-2048 signature should be 256 bytes
      expect(signature.length).toBe(256);
    });

    it("produces different signatures for different data", async () => {
      const signer = await createTestSigner("RSA");
      const data1 = new TextEncoder().encode("Hello");
      const data2 = new TextEncoder().encode("World");

      const sig1 = await signer.sign(data1, "SHA-256");
      const sig2 = await signer.sign(data2, "SHA-256");

      // Signatures should be different
      expect(sig1).not.toEqual(sig2);
    });

    it("produces consistent signature for same data", async () => {
      const signer = await createTestSigner("RSA");
      const data = new TextEncoder().encode("Consistent data");

      const sig1 = await signer.sign(data, "SHA-256");
      const sig2 = await signer.sign(data, "SHA-256");

      // RSA PKCS#1 v1.5 is deterministic, so same input = same output
      expect(sig1).toEqual(sig2);
    });

    it("handles large data correctly (hashes internally)", async () => {
      const signer = await createTestSigner("RSA");

      // Create data larger than any hash output to verify hashing occurs
      const largeData = new Uint8Array(10000);
      crypto.getRandomValues(largeData);

      const signature = await signer.sign(largeData, "SHA-256");

      // Should produce valid signature regardless of input size
      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBe(256);
    });
  });

  describe("ECDSA signing", () => {
    it("signs data with ECDSA key", async () => {
      const signer = await createTestSigner("ECDSA");
      const testData = new TextEncoder().encode("Hello, World!");

      const signature = await signer.sign(testData, "SHA-256");

      expect(signature).toBeInstanceOf(Uint8Array);
      expect(signature.length).toBeGreaterThan(0);
      // ECDSA P-256 signature is typically 64-72 bytes (DER encoded)
      expect(signature.length).toBeGreaterThanOrEqual(64);
      expect(signature.length).toBeLessThanOrEqual(72);
    });

    it("produces different signatures for same data (non-deterministic)", async () => {
      const signer = await createTestSigner("ECDSA");
      const data = new TextEncoder().encode("Same data");

      const sig1 = await signer.sign(data, "SHA-256");
      const sig2 = await signer.sign(data, "SHA-256");

      // ECDSA uses random k, so signatures should differ
      // (very small chance they're equal, but practically never)
      expect(sig1).not.toEqual(sig2);
    });
  });

  describe("signer properties", () => {
    it("exposes certificate and chain", async () => {
      const signer = await createTestSigner("RSA");

      expect(signer.certificate).toBeInstanceOf(Uint8Array);
      expect(signer.certificate.length).toBeGreaterThan(0);
      expect(signer.certificateChain).toBeInstanceOf(Array);
    });

    it("exposes key type and algorithm for RSA", async () => {
      const signer = await createTestSigner("RSA");

      expect(signer.keyType).toBe("RSA");
      expect(signer.signatureAlgorithm).toBe("RSASSA-PKCS1-v1_5");
    });

    it("exposes key type and algorithm for ECDSA", async () => {
      const signer = await createTestSigner("ECDSA");

      expect(signer.keyType).toBe("EC");
      expect(signer.signatureAlgorithm).toBe("ECDSA");
    });
  });

  describe("PDF signing integration", () => {
    it("signs a PDF document with RSA CryptoKeySigner", async () => {
      const pdfBytes = await loadFixture("basic", "rot0.pdf");
      const pdf = await PDF.load(pdfBytes);
      const signer = await createTestSigner("RSA");

      const { bytes, warnings } = await pdf.sign({
        signer,
        reason: "CryptoKeySigner RSA test",
        location: "Test Suite",
      });

      // Should produce valid PDF
      expect(bytes.length).toBeGreaterThan(pdfBytes.length);
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

      // Should have no warnings
      expect(warnings).toHaveLength(0);

      // Should contain signature dictionary
      const pdfStr = new TextDecoder().decode(bytes);
      expect(pdfStr).toContain("/Type /Sig");
      expect(pdfStr).toContain("/Filter /Adobe.PPKLite");
      expect(pdfStr).toContain("/SubFilter /ETSI.CAdES.detached");
      expect(pdfStr).toContain("/Reason (CryptoKeySigner RSA test)");

      // Save for manual inspection
      await saveTestOutput("signatures/signed-cryptokey-rsa.pdf", bytes);
    });

    it("signs a PDF document with ECDSA CryptoKeySigner", async () => {
      const pdfBytes = await loadFixture("basic", "rot0.pdf");
      const pdf = await PDF.load(pdfBytes);
      const signer = await createTestSigner("ECDSA");

      const { bytes, warnings } = await pdf.sign({
        signer,
        reason: "CryptoKeySigner ECDSA test",
        location: "Test Suite",
      });

      // Should produce valid PDF
      expect(bytes.length).toBeGreaterThan(pdfBytes.length);
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");

      // Should have no warnings
      expect(warnings).toHaveLength(0);

      // Should contain signature dictionary
      const pdfStr = new TextDecoder().decode(bytes);
      expect(pdfStr).toContain("/Type /Sig");
      expect(pdfStr).toContain("/Reason (CryptoKeySigner ECDSA test)");

      // Save for manual inspection
      await saveTestOutput("signatures/signed-cryptokey-ecdsa.pdf", bytes);
    });

    it("signed PDF can be loaded and parsed", async () => {
      const pdfBytes = await loadFixture("basic", "rot0.pdf");
      const pdf = await PDF.load(pdfBytes);
      const signer = await createTestSigner("RSA");

      const { bytes } = await pdf.sign({ signer });

      // Should be able to load the signed PDF
      const signedPdf = await PDF.load(bytes);

      // Should have the same page count
      expect(signedPdf.getPageCount()).toBe(pdf.getPageCount());
    });
  });
});
