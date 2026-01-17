/**
 * Example: Document Dates
 *
 * This example demonstrates working with creation and modification dates,
 * setting them using JavaScript Date objects and reading them back.
 *
 * Run: npx tsx examples/06-metadata/document-dates.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Working with document dates...\n");

  // === Reading dates from existing PDFs ===
  console.log("=== Reading Dates from Existing PDF ===\n");

  const existingBytes = await loadFixture("basic", "rot0.pdf");
  const existingPdf = await PDF.load(existingBytes);

  const existingCreation = existingPdf.getCreationDate();
  const existingModification = existingPdf.getModificationDate();

  console.log("Existing PDF dates:");

  if (existingCreation) {
    console.log(`  Creation Date: ${existingCreation.toISOString()}`);
    console.log(`    Local: ${existingCreation.toLocaleString()}`);
    console.log(`    Timestamp: ${existingCreation.getTime()}`);
  } else {
    console.log("  Creation Date: (not set)");
  }

  if (existingModification) {
    console.log(`  Modification Date: ${existingModification.toISOString()}`);
    console.log(`    Local: ${existingModification.toLocaleString()}`);
  } else {
    console.log("  Modification Date: (not set)");
  }

  // === Setting dates on a new PDF ===
  console.log("\n=== Setting Dates on New PDF ===\n");

  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Document Date Examples", {
      x: 180,
      y: page.height - 50,
      size: 20,
      color: black,
    });
  }

  // Set creation date to a specific date/time
  const creationDate = new Date("2024-01-15T14:30:00-05:00"); // EST timezone
  pdf.setCreationDate(creationDate);
  console.log(`Set creation date: ${creationDate.toISOString()}`);

  // Set modification date to now
  const modificationDate = new Date();
  pdf.setModificationDate(modificationDate);
  console.log(`Set modification date: ${modificationDate.toISOString()}`);

  // === Different ways to create dates ===
  console.log("\n=== Different Date Creation Methods ===\n");

  // Method 1: ISO string
  const date1 = new Date("2024-06-15T09:00:00Z");
  console.log(`From ISO string: ${date1.toISOString()}`);

  // Method 2: Individual components
  const date2 = new Date(2024, 5, 15, 9, 0, 0); // Note: month is 0-indexed
  console.log(`From components: ${date2.toISOString()}`);

  // Method 3: Timestamp
  const date3 = new Date(1718441400000);
  console.log(`From timestamp: ${date3.toISOString()}`);

  // Method 4: Current time
  const date4 = new Date();
  console.log(`Current time: ${date4.toISOString()}`);

  // === Demonstrating date preservation ===
  console.log("\n=== Date Preservation After Save/Reload ===\n");

  // Add date info to the page
  if (page) {
    page.drawText(`Creation: ${creationDate.toISOString()}`, {
      x: 50,
      y: page.height - 150,
      size: 11,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawText(`Modified: ${modificationDate.toISOString()}`, {
      x: 50,
      y: page.height - 170,
      size: 11,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  // Save and reload
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("06-metadata/document-dates.pdf", savedBytes);

  console.log(`Saved: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Reload and verify dates
  const reloaded = await PDF.load(savedBytes);
  const reloadedCreation = reloaded.getCreationDate();
  const reloadedModification = reloaded.getModificationDate();

  console.log("\nAfter reload:");
  console.log(`  Creation: ${reloadedCreation?.toISOString()}`);
  console.log(`  Modified: ${reloadedModification?.toISOString()}`);

  // Check if dates match (within 1 second tolerance for rounding)
  if (reloadedCreation) {
    const diff = Math.abs(reloadedCreation.getTime() - creationDate.getTime());
    console.log(`  Creation date match: ${diff < 1000 ? "Yes" : `No (diff: ${diff}ms)`}`);
  }

  // === Time zone considerations ===
  console.log("\n=== Time Zone Notes ===");
  console.log("PDF dates include timezone information.");
  console.log("JavaScript Dates are always stored in UTC internally.");
  console.log("The library preserves timezone offsets when parsing/writing.");

  console.log("\nExample time zones:");
  const utcDate = new Date("2024-03-15T12:00:00Z");
  console.log(`  UTC: ${utcDate.toISOString()}`);
  console.log(`  Local: ${utcDate.toLocaleString()}`);

  // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
  console.log("\nPDF date format example:");
  console.log("  D:20240315120000+00'00' = March 15, 2024, 12:00 UTC");
  console.log("  D:20240315070000-05'00' = March 15, 2024, 7:00 EST");
}

main().catch(console.error);
