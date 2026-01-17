/**
 * Example: Add Signature Field
 *
 * This example demonstrates creating a signature field on a page without
 * signing it, preparing a document for later signing.
 *
 * Run: npx tsx examples/07-signatures/add-signature-field.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Creating a document with signature field...\n");

  // Create a document
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Add content
  page.drawText("Contract Agreement", {
    x: 200,
    y: page.height - 50,
    size: 24,
    color: black,
  });

  page.drawText("This is a sample contract that requires a signature.", {
    x: 100,
    y: page.height - 100,
    size: 14,
    color: black,
  });

  page.drawText("Terms and conditions would appear here...", {
    x: 50,
    y: page.height - 150,
    size: 12,
    color: black,
  });

  // Draw signature line area
  page.drawRectangle({
    x: 50,
    y: 100,
    width: 250,
    height: 60,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });

  page.drawText("Signature:", {
    x: 55,
    y: 145,
    size: 10,
    color: black,
  });

  page.drawText("Date:", {
    x: 320,
    y: 145,
    size: 10,
    color: black,
  });

  page.drawLine({
    start: { x: 320, y: 110 },
    end: { x: 450, y: 110 },
    thickness: 1,
    color: black,
  });

  // Get or create the form
  const form = pdf.getOrCreateForm();

  // Create an unsigned signature field
  // Note: Signature fields are invisible until signed. The visual "signature area"
  // is just drawn content (like the rectangle above). When the document is signed,
  // the signature field will be positioned automatically.
  console.log("Creating signature field...");
  const signatureField = form.createSignatureField("Signature1");

  console.log(`Created signature field: ${signatureField.name}`);
  console.log(`  Is signed: ${signatureField.isSigned()}`);

  // Create a second signature field for a witness
  // The visual area is drawn content - signature fields are invisible until signed
  page.drawText("Witness:", {
    x: 350,
    y: page.height - 600,
    size: 10,
    color: black,
  });

  page.drawRectangle({
    x: 350,
    y: page.height - 660,
    width: 200,
    height: 50,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });

  const witnessField = form.createSignatureField("Witness");
  console.log(`Created signature field: ${witnessField.name}`);

  // Save the document
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("07-signatures/document-with-sig-fields.pdf", savedBytes);

  console.log("\n=== Document Saved ===");
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Verify
  const reloaded = await PDF.load(savedBytes);
  const reloadedForm = reloaded.getForm();

  console.log("\n=== Verification ===");
  console.log(`Signature fields: ${reloadedForm?.getSignatureFields().length}`);

  for (const sig of reloadedForm?.getSignatureFields() ?? []) {
    console.log(`  - ${sig.name}: ${sig.isSigned() ? "signed" : "unsigned"}`);
  }

  console.log("\n=== Next Steps ===");
  console.log("This document can now be:");
  console.log("  - Sent to signers via email");
  console.log("  - Signed in Adobe Reader");
  console.log("  - Signed programmatically with pdf.sign({ fieldName: 'Signature1', ... })");
}

main().catch(console.error);
