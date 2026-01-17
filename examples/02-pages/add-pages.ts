/**
 * Example: Add Pages with Different Sizes
 *
 * This example demonstrates how to create a PDF and add multiple pages
 * with different sizes (letter, A4, custom dimensions).
 *
 * Run: npx tsx examples/02-pages/add-pages.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Creating PDF with multiple page sizes...\n");

  // Create a new PDF document
  const pdf = PDF.create();

  // Add a letter-size page (8.5" x 11" = 612 x 792 points)
  console.log("Adding page 1: Letter size (8.5 x 11 inches)");
  pdf.addPage({ size: "letter" });

  // Add an A4-size page (210 x 297 mm = 595 x 842 points)
  console.log("Adding page 2: A4 size (210 x 297 mm)");
  pdf.addPage({ size: "a4" });

  // Add a legal-size page (8.5" x 14" = 612 x 1008 points)
  console.log("Adding page 3: Legal size (8.5 x 14 inches)");
  pdf.addPage({ size: "legal" });

  // Add a custom-size page (specify width and height in points)
  // 1 inch = 72 points, so 5" x 7" = 360 x 504 points
  console.log("Adding page 4: Custom size (5 x 7 inches)");
  pdf.addPage({ width: 5 * 72, height: 7 * 72 });

  // Add a landscape letter page
  console.log("Adding page 5: Letter landscape");
  pdf.addPage({ size: "letter", orientation: "landscape" });

  // Add a rotated page (portrait dimensions but rotated 90 degrees)
  console.log("Adding page 6: Letter with 90-degree rotation");
  pdf.addPage({ size: "letter", rotate: 90 });

  // Summary
  console.log("\n=== Document Summary ===");
  console.log(`Total Pages: ${pdf.getPageCount()}`);

  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) {
      continue;
    }

    console.log(
      `  Page ${i + 1}: ${page.width.toFixed(0)} x ${page.height.toFixed(0)} points, ` +
        `rotation: ${page.rotation}°, ${page.isLandscape ? "landscape" : "portrait"}`,
    );
  }

  // Save the document
  const bytes = await pdf.save();
  const outputPath = await saveOutput("02-pages/multiple-sizes.pdf", bytes);

  console.log(`\nSaved to: ${outputPath}`);
  console.log(`File size: ${formatBytes(bytes.length)}`);
}

main().catch(console.error);
