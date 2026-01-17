/**
 * Example: Sign with Timestamp
 *
 * This example demonstrates how to sign a PDF and include an RFC 3161
 * timestamp from a timestamp authority (PAdES B-T level).
 *
 * Note: This example requires network access to a timestamp authority.
 *
 * Run: npx tsx examples/07-signatures/sign-with-timestamp.ts
 */

import { black, HttpTimestampAuthority, P12Signer, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Signing a PDF with timestamp (PAdES B-T)...\n");

  // Create a document to sign
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Timestamped Document", {
      x: 190,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText("This document has been signed with a timestamp.", {
      x: 130,
      y: page.height - 100,
      size: 14,
      color: black,
    });

    page.drawText("The timestamp provides cryptographic proof of when the signature was created.", {
      x: 70,
      y: page.height - 130,
      size: 12,
      color: black,
    });

    page.drawText("PAdES Level: B-T (Basic with Timestamp)", {
      x: 180,
      y: page.height - 180,
      size: 12,
      color: rgb(0.3, 0.3, 0.6),
    });
  }

  // Load the P12 certificate
  console.log("Loading P12 certificate...");
  const p12Bytes = await loadFixture("certificates", "test-signer-aes256.p12");
  const signer = await P12Signer.create(p12Bytes, "test123");
  console.log(`Signer ready: ${signer.keyType}`);

  // Create a timestamp authority
  // Note: This requires network access. Common free TSAs include:
  // - http://timestamp.digicert.com
  // - http://time.certum.pl
  // - http://timestamp.sectigo.com
  console.log("\nConfiguring timestamp authority...");
  const tsa = new HttpTimestampAuthority("http://timestamp.digicert.com");
  console.log("TSA URL: http://timestamp.digicert.com");

  // Sign with timestamp (B-T level)
  console.log("\nSigning document with timestamp...");
  console.log("This may take a few seconds to contact the TSA...");

  try {
    const { bytes: signedBytes, warnings } = await pdf.sign({
      signer,
      reason: "I approve this document",
      location: "New York, NY",
      level: "B-T", // Request timestamp
      timestampAuthority: tsa,
    });

    // Show any warnings
    if (warnings.length > 0) {
      console.log(`\nWarnings: ${warnings.length}`);
      for (const warning of warnings) {
        console.log(`  - ${warning.code}: ${warning.message}`);
      }
    }

    // Save the signed document
    const outputPath = await saveOutput("07-signatures/signed-with-timestamp.pdf", signedBytes);

    console.log("\n=== Signing Complete ===");
    console.log(`Output: ${outputPath}`);
    console.log(`Size: ${formatBytes(signedBytes.length)}`);

    console.log("\n=== Timestamp Benefits ===");
    console.log("A timestamp proves:");
    console.log("  - The document existed at a specific time");
    console.log("  - The signature was created at that time");
    console.log("  - Even if the signing certificate expires, the signature remains valid");
    console.log("  - The time is trusted (not just the signer's clock)");
  } catch (error) {
    console.error("\nFailed to sign with timestamp:");
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);

    console.log("\n=== Fallback: Signing without timestamp ===");

    // Fall back to basic signature
    const { bytes: basicBytes } = await pdf.sign({
      signer,
      reason: "I approve this document",
      location: "New York, NY",
      level: "B-B", // Basic level, no timestamp
    });

    const fallbackPath = await saveOutput("07-signatures/signed-without-timestamp.pdf", basicBytes);

    console.log(`Output: ${fallbackPath}`);
    console.log(`Size: ${formatBytes(basicBytes.length)}`);
    console.log("\nNote: This signature doesn't have a timestamp (B-B level only).");
  }

  console.log("\n=== PAdES Levels ===");
  console.log("B-B:  Basic signature (no timestamp)");
  console.log("B-T:  + Timestamp from TSA (proves signing time)");
  console.log("B-LT: + Revocation data (CRL/OCSP) for long-term validation");
  console.log("B-LTA: + Document timestamp for archival");
}

main().catch(console.error);
