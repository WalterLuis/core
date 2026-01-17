/**
 * Example: Sign with Long-Term Validation
 *
 * This example demonstrates signing a PDF with full long-term validation data
 * including OCSP responses and CRLs (PAdES B-LT level).
 *
 * Note: This example requires network access to fetch revocation data.
 *
 * Run: npx tsx examples/07-signatures/sign-with-long-term-validation.ts
 */

import { black, HttpTimestampAuthority, P12Signer, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Signing a PDF with long-term validation (PAdES B-LT)...\n");

  // Create a document to sign
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Long-Term Validated Document", {
      x: 150,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText("This document has been signed with long-term validation data.", {
      x: 100,
      y: page.height - 100,
      size: 14,
      color: black,
    });

    page.drawText("It includes:", {
      x: 50,
      y: page.height - 140,
      size: 12,
      color: black,
    });

    const features = [
      "RFC 3161 timestamp proving when the signature was created",
      "OCSP responses or CRLs proving certificates were valid",
      "Complete certificate chain for verification",
      "All data needed to verify the signature offline",
    ];

    let yPos = page.height - 165;
    for (const feature of features) {
      page.drawText(`  - ${feature}`, {
        x: 60,
        y: yPos,
        size: 11,
        color: black,
      });
      yPos -= 20;
    }

    page.drawText("PAdES Level: B-LT (Long-Term)", {
      x: 200,
      y: yPos - 20,
      size: 12,
      color: rgb(0.3, 0.3, 0.6),
    });
  }

  // Load the P12 certificate
  console.log("Loading P12 certificate...");
  const p12Bytes = await loadFixture("certificates", "test-signer-aes256.p12");
  const signer = await P12Signer.create(p12Bytes, "test123");

  // Create timestamp authority
  const tsa = new HttpTimestampAuthority("http://timestamp.digicert.com");

  // The library automatically creates a revocation provider for B-LT level
  // It fetches OCSP responses and CRLs for the certificate chain

  console.log("Signing with long-term validation...");
  console.log("This fetches timestamps and revocation data from the network...\n");

  try {
    const { bytes: signedBytes, warnings } = await pdf.sign({
      signer,
      reason: "I approve this document",
      location: "New York, NY",
      level: "B-LT", // Long-term validation (auto-fetches revocation data)
      timestampAuthority: tsa,
    });

    // Show warnings
    if (warnings.length > 0) {
      console.log(`Warnings: ${warnings.length}`);
      for (const warning of warnings) {
        console.log(`  - ${warning.code}: ${warning.message}`);
      }
    }

    // Save the signed document
    const outputPath = await saveOutput("07-signatures/signed-long-term.pdf", signedBytes);

    console.log("\n=== Signing Complete ===");
    console.log(`Output: ${outputPath}`);
    console.log(`Size: ${formatBytes(signedBytes.length)}`);

    console.log("\n=== Long-Term Validation Benefits ===");
    console.log("The signature remains verifiable even:");
    console.log("  - After the signing certificate expires");
    console.log("  - After OCSP responders are no longer available");
    console.log("  - After CRL distribution points are offline");
    console.log("  - Years in the future (archival)");
  } catch (error) {
    console.error("\nFailed to sign with B-LT level:");
    console.error(`  ${error instanceof Error ? error.message : String(error)}`);

    // Fall back to B-T level
    console.log("\n=== Fallback: Signing with B-T level ===");

    try {
      const { bytes: btBytes } = await pdf.sign({
        signer,
        reason: "I approve this document",
        level: "B-T",
        timestampAuthority: tsa,
      });

      const fallbackPath = await saveOutput("07-signatures/signed-b-t-fallback.pdf", btBytes);

      console.log(`Output: ${fallbackPath}`);
      console.log(`Size: ${formatBytes(btBytes.length)}`);
    } catch {
      // Final fallback to basic signature
      console.log("\n=== Final Fallback: Basic signature (B-B) ===");

      const { bytes: bbBytes } = await pdf.sign({
        signer,
        reason: "I approve this document",
        level: "B-B",
      });

      const basicPath = await saveOutput("07-signatures/signed-b-b-fallback.pdf", bbBytes);

      console.log(`Output: ${basicPath}`);
      console.log(`Size: ${formatBytes(bbBytes.length)}`);
    }
  }

  console.log("\n=== Document Security Store (DSS) ===");
  console.log("B-LT level adds a DSS to the PDF containing:");
  console.log("  - /Certs: All certificates in the chain");
  console.log("  - /OCSPs: OCSP responses for each certificate");
  console.log("  - /CRLs: Certificate Revocation Lists");
  console.log("  - /VRI: Validation-Related Information per signature");
}

main().catch(console.error);
