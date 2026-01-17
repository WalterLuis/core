/**
 * Example: Trapped Status
 *
 * This example demonstrates reading and setting the document's trapped status
 * for prepress workflows, showing the "True", "False", and "Unknown" values.
 *
 * Run: npx tsx examples/06-metadata/trapped-status.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Working with document trapped status...\n");

  // === What is trapping? ===
  console.log("=== What is Trapping? ===\n");
  console.log("Trapping is a prepress technique used in commercial printing to prevent");
  console.log("gaps (white lines) or overlaps at the edges where different colors meet.");
  console.log("This can happen due to slight misregistration during printing.");
  console.log("\nThe 'Trapped' metadata field indicates whether trapping has been applied:");
  console.log("  - True:    Document has been trapped");
  console.log("  - False:   Document has not been trapped");
  console.log("  - Unknown: Trapping status is unknown or partially trapped");

  // === Reading trapped status ===
  console.log("\n=== Reading Trapped Status ===\n");

  const existingBytes = await loadFixture("basic", "rot0.pdf");
  const existingPdf = await PDF.load(existingBytes);

  const existingTrapped = existingPdf.getTrapped();
  console.log(`Existing PDF trapped status: ${existingTrapped ?? "(not set)"}`);

  // === Creating documents with different trapped status ===

  // Document 1: Trapped = False (not trapped)
  console.log("\n=== Creating Document: Trapped = False ===\n");

  const pdf1 = PDF.create();
  pdf1.addPage({ size: "letter" });

  const page1 = pdf1.getPage(0);
  if (page1) {
    page1.drawText("Untrapped Document", {
      x: 180,
      y: page1.height - 50,
      size: 24,
      color: black,
    });

    page1.drawText("Trapped: False", {
      x: 50,
      y: page1.height - 100,
      size: 14,
      color: rgb(0.8, 0.2, 0.2),
    });

    page1.drawText("This document has not had trapping applied.", {
      x: 50,
      y: page1.height - 130,
      size: 12,
      color: black,
    });

    page1.drawText("Trapping may need to be applied before printing.", {
      x: 50,
      y: page1.height - 150,
      size: 12,
      color: black,
    });
  }

  pdf1.setTrapped("False");
  pdf1.setTitle("Untrapped Document Example");

  console.log(`Set trapped: ${pdf1.getTrapped()}`);

  const bytes1 = await pdf1.save();
  const path1 = await saveOutput("06-metadata/trapped-false.pdf", bytes1);
  console.log(`Saved: ${path1}`);

  // Document 2: Trapped = True
  console.log("\n=== Creating Document: Trapped = True ===\n");

  const pdf2 = PDF.create();
  pdf2.addPage({ size: "letter" });

  const page2 = pdf2.getPage(0);
  if (page2) {
    page2.drawText("Trapped Document", {
      x: 195,
      y: page2.height - 50,
      size: 24,
      color: black,
    });

    page2.drawText("Trapped: True", {
      x: 50,
      y: page2.height - 100,
      size: 14,
      color: rgb(0.2, 0.6, 0.2),
    });

    page2.drawText("This document has had trapping applied.", {
      x: 50,
      y: page2.height - 130,
      size: 12,
      color: black,
    });

    page2.drawText("It is ready for commercial printing.", {
      x: 50,
      y: page2.height - 150,
      size: 12,
      color: black,
    });
  }

  pdf2.setTrapped("True");
  pdf2.setTitle("Trapped Document Example");

  console.log(`Set trapped: ${pdf2.getTrapped()}`);

  const bytes2 = await pdf2.save();
  const path2 = await saveOutput("06-metadata/trapped-true.pdf", bytes2);
  console.log(`Saved: ${path2}`);

  // Document 3: Trapped = Unknown
  console.log("\n=== Creating Document: Trapped = Unknown ===\n");

  const pdf3 = PDF.create();
  pdf3.addPage({ size: "letter" });

  const page3 = pdf3.getPage(0);
  if (page3) {
    page3.drawText("Partially Trapped Document", {
      x: 145,
      y: page3.height - 50,
      size: 24,
      color: black,
    });

    page3.drawText("Trapped: Unknown", {
      x: 50,
      y: page3.height - 100,
      size: 14,
      color: rgb(0.6, 0.4, 0.0),
    });

    page3.drawText("The trapping status of this document is unknown.", {
      x: 50,
      y: page3.height - 130,
      size: 12,
      color: black,
    });

    page3.drawText("Possible reasons:", {
      x: 50,
      y: page3.height - 160,
      size: 12,
      color: black,
    });

    page3.drawText("- Some pages are trapped, others are not", {
      x: 70,
      y: page3.height - 180,
      size: 11,
      color: black,
    });

    page3.drawText("- Trapping status was not recorded", {
      x: 70,
      y: page3.height - 198,
      size: 11,
      color: black,
    });

    page3.drawText("- Document needs review before printing", {
      x: 70,
      y: page3.height - 216,
      size: 11,
      color: black,
    });
  }

  pdf3.setTrapped("Unknown");
  pdf3.setTitle("Unknown Trapping Status Example");

  console.log(`Set trapped: ${pdf3.getTrapped()}`);

  const bytes3 = await pdf3.save();
  const path3 = await saveOutput("06-metadata/trapped-unknown.pdf", bytes3);
  console.log(`Saved: ${path3}`);

  // === When to use each value ===
  console.log("\n=== When to Use Each Value ===");
  console.log("\nUse 'True' when:");
  console.log("  - Document has been professionally prepared for press");
  console.log("  - Trapping has been applied to all color boundaries");
  console.log("  - Document is ready for commercial printing");

  console.log("\nUse 'False' when:");
  console.log("  - Document is a draft or proof");
  console.log("  - Trapping will be applied by the printer");
  console.log("  - Document is for digital viewing only");

  console.log("\nUse 'Unknown' when:");
  console.log("  - Trapping status is uncertain");
  console.log("  - Document was merged from multiple sources");
  console.log("  - Only parts of the document are trapped");

  // Summary
  console.log("\n=== Summary ===");
  console.log(`\nCreated three documents with different trapped status:`);
  console.log(`  1. ${path1} (False)`);
  console.log(`  2. ${path2} (True)`);
  console.log(`  3. ${path3} (Unknown)`);
  console.log(`\nTotal sizes: ${formatBytes(bytes1.length + bytes2.length + bytes3.length)}`);
}

main().catch(console.error);
