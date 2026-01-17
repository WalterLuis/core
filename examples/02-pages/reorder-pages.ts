/**
 * Example: Reorder Pages in a PDF
 *
 * This example demonstrates how to reorder pages in a PDF document,
 * including reversing the page order and moving specific pages.
 *
 * Run: npx tsx examples/02-pages/reorder-pages.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Reordering pages in a PDF...\n");

  // Create a PDF with numbered pages for demonstration
  const pdf = PDF.create();

  // Add 5 pages with numbers drawn on them
  const pageCount = 5;
  for (let i = 1; i <= pageCount; i++) {
    pdf.addPage({ size: "letter" });
  }

  // Add page numbers to each page for visual reference
  const pages = pdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (page) {
      page.drawText(`Original Page ${i + 1}`, {
        x: 200,
        y: 400,
        size: 48,
        color: black,
      });
    }
  }

  console.log("=== Original Order ===");
  console.log(`Pages: 1, 2, 3, 4, 5`);

  // Move the first page to the end
  console.log("\nMoving page 1 to the end...");
  pdf.movePage(0, pdf.getPageCount() - 1);
  // Result: 2, 3, 4, 5, 1

  console.log("New order: 2, 3, 4, 5, 1");

  // Move the last page (originally page 1) back to the beginning
  console.log("\nMoving last page back to the beginning...");
  pdf.movePage(pdf.getPageCount() - 1, 0);
  // Result: 1, 2, 3, 4, 5

  console.log("New order: 1, 2, 3, 4, 5 (restored)");

  // Reverse the entire document
  console.log("\nReversing all pages...");
  // To reverse, we repeatedly move the first page to the end
  // After n-1 moves, the order is completely reversed
  for (let i = 0; i < pageCount - 1; i++) {
    pdf.movePage(0, pdf.getPageCount() - 1 - i);
  }
  // Result: 5, 4, 3, 2, 1

  console.log("New order: 5, 4, 3, 2, 1");

  // Save the reversed document
  const bytes = await pdf.save();
  const outputPath = await saveOutput("02-pages/pages-reordered.pdf", bytes);

  console.log(`\n=== Document Saved ===`);
  console.log(`Output: ${outputPath}`);
  console.log(`File size: ${formatBytes(bytes.length)}`);
  console.log(`\nOpen the PDF to verify pages are in reverse order.`);
}

main().catch(console.error);
