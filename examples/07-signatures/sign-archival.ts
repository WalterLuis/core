/**
 * Example: Sign for Archival (PAdES B-LTA)
 *
 * This example demonstrates creating an archival signature with document
 * timestamp for maximum longevity (PAdES B-LTA level).
 *
 * Run: npx tsx examples/07-signatures/sign-archival.ts
 */

import { black, HttpTimestampAuthority, P12Signer, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Creating archival signature (PAdES B-LTA)...\n");

  // Create a document
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Archival Document", {
      x: 200,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText("This document is signed for long-term archival.", {
      x: 130,
      y: page.height - 100,
      size: 14,
      color: black,
    });

    page.drawText("PAdES B-LTA includes:", {
      x: 50,
      y: page.height - 150,
      size: 12,
      color: black,
    });

    const features = [
      "Digital signature with signing certificate",
      "RFC 3161 signature timestamp",
      "Complete certificate chain",
      "Revocation data (OCSP/CRL)",
      "Document timestamp for archival",
    ];

    let yPos = page.height - 175;
    for (const feature of features) {
      page.drawText(`  - ${feature}`, { x: 60, y: yPos, size: 11, color: black });
      yPos -= 18;
    }

    page.drawText("PAdES Level: B-LTA (Long-Term Archival)", {
      x: 170,
      y: yPos - 20,
      size: 12,
      color: rgb(0.3, 0.3, 0.6),
    });
  }

  // Load certificate
  const p12Bytes = await loadFixture("certificates", "test-signer-aes256.p12");
  const signer = await P12Signer.create(p12Bytes, "test123");

  // Create timestamp authority
  const tsa = new HttpTimestampAuthority("http://timestamp.digicert.com");

  console.log("Signing for archival (B-LTA level)...\n");

  try {
    const { bytes: signedBytes, warnings } = await pdf.sign({
      signer,
      reason: "Archival signature",
      location: "Archive Server",
      level: "B-LTA", // Full archival level
      timestampAuthority: tsa,
    });

    if (warnings.length > 0) {
      console.log(`Warnings: ${warnings.length}`);
      for (const warning of warnings) {
        console.log(`  - ${warning.code}: ${warning.message}`);
      }
    }

    const outputPath = await saveOutput("07-signatures/archival-signature.pdf", signedBytes);

    console.log("=== Archival Signature Complete ===");
    console.log(`Output: ${outputPath}`);
    console.log(`Size: ${formatBytes(signedBytes.length)}`);

    console.log("\n=== B-LTA Features ===");
    console.log("The document timestamp (at B-LTA level):");
    console.log("  - Protects the DSS revocation data");
    console.log("  - Allows re-timestamping for indefinite validity");
    console.log("  - Meets archival requirements (10+ years)");
  } catch (error) {
    console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);

    // Fallback
    const { bytes: fallbackBytes } = await pdf.sign({
      signer,
      reason: "Basic signature (archival failed)",
      level: "B-B",
    });

    const fallbackPath = await saveOutput("07-signatures/archival-fallback.pdf", fallbackBytes);
    console.log(`Fallback output: ${fallbackPath}`);
  }
}

main().catch(console.error);
