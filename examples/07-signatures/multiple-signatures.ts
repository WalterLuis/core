/**
 * Example: Multiple Signatures
 *
 * This example demonstrates adding multiple signatures to a document,
 * preserving previous signatures with incremental saves.
 *
 * Run: npx tsx examples/07-signatures/multiple-signatures.ts
 */

import { black, P12Signer, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Creating document with multiple signatures...\n");

  // Create a document
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);

  if (page) {
    page.drawText("Multi-Party Agreement", {
      x: 175,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText("This agreement requires multiple signatures.", {
      x: 140,
      y: page.height - 100,
      size: 14,
      color: black,
    });

    page.drawText("Signature 1 (Party A):", {
      x: 50,
      y: 200,
      size: 12,
      color: black,
    });

    page.drawRectangle({
      x: 50,
      y: 130,
      width: 200,
      height: 60,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });

    page.drawText("Signature 2 (Party B):", {
      x: 320,
      y: 200,
      size: 12,
      color: black,
    });

    page.drawRectangle({
      x: 320,
      y: 130,
      width: 200,
      height: 60,
      borderColor: rgb(0.7, 0.7, 0.7),
      borderWidth: 1,
    });
  }

  // Load certificate (in real scenarios, each party would have their own)
  const p12Bytes = await loadFixture("certificates", "test-signer-aes256.p12");
  const signer1 = await P12Signer.create(p12Bytes, "test123");

  // For demonstration, we'll use the same certificate for both signatures
  // In practice, each party would have their own certificate
  const signer2 = signer1;

  // === First Signature ===
  console.log("=== First Signature (Party A) ===\n");

  const { bytes: afterFirstSig } = await pdf.sign({
    signer: signer1,
    reason: "Party A agrees to the terms",
    location: "New York, NY",
    fieldName: "Signature_PartyA",
  });

  console.log(`After first signature: ${formatBytes(afterFirstSig.length)}`);

  // Save intermediate version
  await saveOutput("07-signatures/multi-sig-step1.pdf", afterFirstSig);

  // === Second Signature ===
  console.log("\n=== Second Signature (Party B) ===");
  console.log("Loading signed document and adding second signature...\n");

  // Load the already-signed document
  const pdfWithFirstSig = await PDF.load(afterFirstSig);

  // Add second signature (uses incremental save to preserve first)
  const { bytes: afterSecondSig, warnings } = await pdfWithFirstSig.sign({
    signer: signer2,
    reason: "Party B agrees to the terms",
    location: "Los Angeles, CA",
    fieldName: "Signature_PartyB",
  });

  if (warnings.length > 0) {
    console.log(`Warnings: ${warnings.length}`);
    for (const warning of warnings) {
      console.log(`  - ${warning.code}: ${warning.message}`);
    }
  }

  console.log(`After second signature: ${formatBytes(afterSecondSig.length)}`);

  // Save final version
  const outputPath = await saveOutput("07-signatures/multi-sig-final.pdf", afterSecondSig);

  console.log("\n=== Final Document ===");
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(afterSecondSig.length)}`);

  // Verify both signatures exist
  console.log("\n=== Verification ===");
  const finalPdf = await PDF.load(afterSecondSig);
  const form = finalPdf.getForm();

  const sigFields = form?.getSignatureFields() ?? [];
  console.log(`Total signature fields: ${sigFields.length}`);

  for (const sig of sigFields) {
    console.log(`  - ${sig.name}: ${sig.isSigned() ? "SIGNED" : "unsigned"}`);
  }

  console.log("\n=== How It Works ===");
  console.log("When adding multiple signatures:");
  console.log("  1. First signature is added normally");
  console.log("  2. Subsequent signatures use incremental save");
  console.log("  3. Previous signatures are preserved (not invalidated)");
  console.log("  4. Each signature covers a specific byte range");
  console.log("  5. Adobe Reader shows all signatures in the panel");
}

main().catch(console.error);
