/**
 * Example: Extract Pages from a PDF
 *
 * This example demonstrates how to extract a subset of pages from a PDF
 * into a new, smaller document.
 *
 * Run: npx tsx examples/02-pages/extract-pages.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Extracting pages from a PDF...\n");

  // Create a source PDF with multiple pages
  const sourcePdf = PDF.create();

  // Add 10 pages
  for (let i = 1; i <= 10; i++) {
    sourcePdf.addPage({ size: "letter" });
  }

  // Label each page
  const pages = sourcePdf.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (page) {
      page.drawText(`Page ${i + 1} of 10`, {
        x: 200,
        y: 400,
        size: 48,
        color: black,
      });
    }
  }

  // Save the source document for reference
  const sourceBytes = await sourcePdf.save();
  await saveOutput("02-pages/source-10-pages.pdf", sourceBytes);

  console.log("=== Source Document ===");
  console.log(`Pages: ${sourcePdf.getPageCount()}`);
  console.log(`Size: ${formatBytes(sourceBytes.length)}`);

  // Extract specific pages (0-indexed)
  // Extract pages 1, 3, 5, 7, 9 (the odd-numbered pages)
  console.log("\n=== Extracting Odd Pages (1, 3, 5, 7, 9) ===");
  const oddPagesIndices = [0, 2, 4, 6, 8]; // 0-indexed
  const oddPagesPdf = await sourcePdf.extractPages(oddPagesIndices);

  const oddPagesBytes = await oddPagesPdf.save();
  const oddPagesPath = await saveOutput("02-pages/extracted-odd-pages.pdf", oddPagesBytes);

  console.log(`Extracted ${oddPagesPdf.getPageCount()} pages`);
  console.log(`Size: ${formatBytes(oddPagesBytes.length)}`);
  console.log(`Output: ${oddPagesPath}`);

  // Extract a range of pages (pages 3-7)
  console.log("\n=== Extracting Page Range (3-7) ===");
  const rangeIndices = [2, 3, 4, 5, 6]; // 0-indexed
  const rangePdf = await sourcePdf.extractPages(rangeIndices);

  const rangeBytes = await rangePdf.save();
  const rangePath = await saveOutput("02-pages/extracted-range.pdf", rangeBytes);

  console.log(`Extracted ${rangePdf.getPageCount()} pages`);
  console.log(`Size: ${formatBytes(rangeBytes.length)}`);
  console.log(`Output: ${rangePath}`);

  // Extract just the first and last page
  console.log("\n=== Extracting First and Last Pages ===");
  const firstLastPdf = await sourcePdf.extractPages([0, 9]);

  const firstLastBytes = await firstLastPdf.save();
  const firstLastPath = await saveOutput("02-pages/extracted-first-last.pdf", firstLastBytes);

  console.log(`Extracted ${firstLastPdf.getPageCount()} pages`);
  console.log(`Size: ${formatBytes(firstLastBytes.length)}`);
  console.log(`Output: ${firstLastPath}`);

  console.log("\n=== Summary ===");
  console.log("Created:");
  console.log("  - source-10-pages.pdf (original 10 pages)");
  console.log("  - extracted-odd-pages.pdf (pages 1, 3, 5, 7, 9)");
  console.log("  - extracted-range.pdf (pages 3-7)");
  console.log("  - extracted-first-last.pdf (pages 1 and 10)");
}

main().catch(console.error);
