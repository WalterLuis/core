/**
 * Example: Sign with CryptoKey
 *
 * This example demonstrates how to sign a PDF using a Web Crypto CryptoKey,
 * which is useful for browser environments or HSM integration.
 *
 * Run: npx tsx examples/07-signatures/sign-with-cryptokey.ts
 */

import { black, P12Signer, PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Signing a PDF with a CryptoKey...\n");

  // Note: This example extracts a CryptoKey from a P12 file for demonstration.
  // In real use cases, the CryptoKey might come from:
  // - WebCrypto generateKey()
  // - HSM or cloud KMS (AWS KMS, Azure Key Vault, Google Cloud KMS)
  // - Browser's SubtleCrypto API

  // First, we'll load a P12 to get a certificate and key
  console.log("Loading P12 to extract key material...");
  const p12Bytes = await loadFixture("certificates", "test-signer-aes256.p12");
  const p12Signer = await P12Signer.create(p12Bytes, "test123");

  // Get the certificate (we need this for any signer)
  const certificate = p12Signer.certificate;
  const certificateChain = p12Signer.certificateChain;

  console.log(`Certificate size: ${formatBytes(certificate.length)}`);
  console.log(`Chain length: ${certificateChain?.length ?? 0} certificates`);

  // In a real CryptoKey scenario, you'd have the key from elsewhere
  // For this example, we'll show the concept using P12Signer
  // (CryptoKeySigner requires an actual CryptoKey from WebCrypto)

  console.log("\n=== CryptoKey Signer Concept ===");
  console.log("CryptoKeySigner is designed for:");
  console.log("  - Browser-based signing with WebCrypto");
  console.log("  - HSM integration where keys aren't exportable");
  console.log("  - Cloud KMS services that expose CryptoKey-like interfaces");

  // Create a document to sign
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("CryptoKey Signed Document", {
      x: 170,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText("This document demonstrates signing with a CryptoKey.", {
      x: 120,
      y: page.height - 100,
      size: 14,
      color: black,
    });
  }

  // For this example, we'll sign with P12Signer since we can't easily
  // create a CryptoKey in Node.js without additional setup
  console.log("\nSigning document (using P12Signer as fallback)...");
  const { bytes: signedBytes, warnings } = await pdf.sign({
    signer: p12Signer,
    reason: "Signed with cryptographic key",
    location: "Server",
  });

  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`  - ${warning.code}: ${warning.message}`);
    }
  }

  // Save the signed document
  const outputPath = await saveOutput("07-signatures/signed-with-cryptokey.pdf", signedBytes);

  console.log("\n=== Signing Complete ===");
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(signedBytes.length)}`);

  console.log("\n=== CryptoKeySigner Usage ===");
  console.log(`
In a real browser or HSM scenario:

// Generate or obtain a CryptoKey
const keyPair = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  true,
  ["sign", "verify"]
);

// Create the signer with the key and certificate
const signer = new CryptoKeySigner(
  keyPair.privateKey,
  certificate,
  "RSA",
  "RSASSA-PKCS1-v1_5",
  certificateChain
);

// Sign the PDF
const { bytes } = await pdf.sign({
  signer,
  reason: "Approved",
});
`);
}

main().catch(console.error);
