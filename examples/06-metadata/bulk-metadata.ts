/**
 * Example: Bulk Metadata Operations
 *
 * This example demonstrates using getMetadata() to read all metadata at once
 * and setMetadata() to update multiple fields in a single call.
 *
 * Run: npx tsx examples/06-metadata/bulk-metadata.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Bulk metadata operations...\n");

  // === Read all metadata at once ===
  console.log("=== Reading Metadata from Existing PDF ===\n");

  const existingBytes = await loadFixture("basic", "rot0.pdf");
  const existingPdf = await PDF.load(existingBytes);

  // Get all metadata as a single object
  const existingMetadata = existingPdf.getMetadata();

  console.log("Existing metadata:");
  console.log(JSON.stringify(existingMetadata, null, 2));

  // === Set multiple fields at once ===
  console.log("\n=== Creating New PDF with Bulk Metadata ===\n");

  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Bulk Metadata Example", {
      x: 180,
      y: page.height - 100,
      size: 24,
      color: black,
    });
  }

  // Define metadata as an object
  const newMetadata = {
    title: "Project Documentation",
    author: "Development Team",
    subject: "Technical specifications and user guide",
    keywords: ["documentation", "guide", "specifications", "v2.0"],
    creator: "Documentation Generator",
    producer: "@libpdf/core",
    creationDate: new Date("2024-11-01T09:00:00Z"),
    modificationDate: new Date(),
    language: "en-US",
    trapped: "False" as const,
  };

  console.log("Setting metadata:");
  console.log(JSON.stringify(newMetadata, null, 2));

  // Set all fields at once
  pdf.setMetadata(newMetadata);

  console.log("\nMetadata set successfully!");

  // Verify with getMetadata
  console.log("\n=== Verifying with getMetadata() ===\n");
  const verifyMetadata = pdf.getMetadata();
  console.log(JSON.stringify(verifyMetadata, null, 2));

  // === Partial updates ===
  console.log("\n=== Partial Update (only some fields) ===\n");

  // You can also update just some fields, leaving others unchanged
  pdf.setMetadata({
    title: "Updated Project Documentation",
    modificationDate: new Date(),
  });

  console.log("Updated only title and modification date");

  const afterPartial = pdf.getMetadata();
  console.log("\nAfter partial update:");
  console.log(`  Title: ${afterPartial.title}`);
  console.log(`  Author: ${afterPartial.author}`); // Should be unchanged
  console.log(`  Modification Date: ${afterPartial.modificationDate?.toISOString()}`);

  // Save and reload
  console.log("\n=== Saving and Reloading ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("06-metadata/bulk-metadata.pdf", savedBytes);

  console.log(`Saved: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Reload and verify
  const reloaded = await PDF.load(savedBytes);
  const reloadedMetadata = reloaded.getMetadata();

  console.log("\nMetadata after reload:");
  console.log(`  Title: ${reloadedMetadata.title}`);
  console.log(`  Author: ${reloadedMetadata.author}`);
  console.log(`  Subject: ${reloadedMetadata.subject}`);
  console.log(`  Keywords: ${reloadedMetadata.keywords?.join(", ")}`);
  console.log(`  Language: ${reloadedMetadata.language}`);

  console.log("\n=== Use Cases for Bulk Metadata ===");
  console.log("  - Copying metadata between documents");
  console.log("  - Applying metadata templates");
  console.log("  - Importing metadata from JSON/database");
  console.log("  - Batch processing document metadata");
}

main().catch(console.error);
