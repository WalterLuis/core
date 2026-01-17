/**
 * Example: Sign with P12
 *
 * This example demonstrates how to sign a PDF using a PKCS#12 (.p12/.pfx)
 * certificate file with the P12Signer.
 *
 * Run: npx tsx examples/07-signatures/sign-with-p12.ts
 */

import { black, P12Signer, PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Signing a PDF with a P12 certificate...\n");

  // Create a simple document to sign
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Signed Document", {
      x: 220,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText("This document has been digitally signed.", {
      x: 150,
      y: page.height - 100,
      size: 14,
      color: black,
    });

    page.drawText("The signature can be verified in Adobe Reader or other PDF viewers.", {
      x: 90,
      y: page.height - 130,
      size: 12,
      color: black,
    });
  }

  // Load a P12 certificate
  console.log("Loading P12 certificate...");
  const p12Bytes = await loadFixture("certificates", "test-signer-aes256.p12");
  console.log(`P12 file size: ${formatBytes(p12Bytes.length)}`);

  // Create the P12Signer
  // The password for test certificates is typically "test" or empty
  const signer = await P12Signer.create(p12Bytes, "test123");
  console.log(`Signer key type: ${signer.keyType}`);
  console.log(`Signature algorithm: ${signer.signatureAlgorithm}`);

  // Sign the document
  console.log("\nSigning document...");
  const { bytes: signedBytes, warnings } = await pdf.sign({
    signer,
    reason: "I approve this document",
    location: "New York, NY",
    contactInfo: "signer@example.com",
  });

  // Show any warnings
  if (warnings.length > 0) {
    console.log(`\nWarnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`  - ${warning.code}: ${warning.message}`);
    }
  }

  // Save the signed document
  const outputPath = await saveOutput("07-signatures/signed-with-p12.pdf", signedBytes);

  console.log("\n=== Signing Complete ===");
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(signedBytes.length)}`);

  // Verify the signature is present
  console.log("\nTo verify the signature:");
  console.log("  1. Open the PDF in Adobe Reader");
  console.log(
    "  2. Click on the signature panel (or View > Show/Hide > Navigation Panes > Signatures)",
  );
  console.log("  3. The signature should appear with certificate details");

  console.log("\n=== Notes ===");
  console.log("P12/PFX files contain:");
  console.log("  - The signing certificate");
  console.log("  - The private key (password protected)");
  console.log("  - Optionally, intermediate certificates");
}

main().catch(console.error);
