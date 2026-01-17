/**
 * Example: Create an Empty PDF
 *
 * This example demonstrates how to create a new PDF document from scratch
 * with a single blank page and save it to disk.
 *
 * Run: npx tsx examples/01-basic/create-empty-pdf.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Creating a new empty PDF...\n");

  // Create a new PDF document
  const pdf = PDF.create();

  // Add a single blank page with letter size (8.5" x 11")
  // Standard sizes: "letter", "a4", "legal"
  pdf.addPage({ size: "letter" });

  console.log("=== Document Created ===");
  console.log(`PDF Version: ${pdf.version}`);
  console.log(`Page Count: ${pdf.getPageCount()}`);

  // Get the page to show its dimensions
  const page = pdf.getPage(0);
  if (page) {
    console.log(`\nPage 1 Dimensions:`);
    console.log(`  Width: ${page.width} points (${(page.width / 72).toFixed(2)} inches)`);
    console.log(`  Height: ${page.height} points (${(page.height / 72).toFixed(2)} inches)`);
    console.log(`  Orientation: ${page.isPortrait ? "Portrait" : "Landscape"}`);
  }

  // Save the PDF
  console.log("\nSaving PDF...");
  const bytes = await pdf.save();

  // Write to output directory
  const outputPath = await saveOutput("01-basic/empty-document.pdf", bytes);

  console.log(`\n=== Saved Successfully ===`);
  console.log(`File: ${outputPath}`);
  console.log(`Size: ${formatBytes(bytes.length)}`);
}

main().catch(console.error);
