/**
 * Example: Split PDF by Page Count
 *
 * This example demonstrates splitting a PDF into chunks of N pages each.
 *
 * Run: npx tsx examples/09-merging-and-splitting/split-by-page-count.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Splitting PDF by page count...\n");

  // Create a multi-page PDF
  console.log("=== Creating Source PDF (10 pages) ===\n");

  const pdf = PDF.create();
  for (let i = 1; i <= 10; i++) {
    pdf.addPage({ size: "letter" });
    const page = pdf.getPage(i - 1);
    if (page) {
      page.drawText(`Page ${i} of 10`, {
        x: 220,
        y: page.height - 100,
        size: 36,
        color: black,
      });
      page.drawText(`This is content for page ${i}`, {
        x: 180,
        y: page.height - 160,
        size: 18,
        color: black,
      });
    }
  }

  const sourceBytes = await pdf.save();
  console.log(`Source document: ${pdf.getPageCount()} pages, ${formatBytes(sourceBytes.length)}`);

  // Split into chunks of 3 pages
  const pagesPerChunk = 3;
  console.log(`\n=== Splitting into chunks of ${pagesPerChunk} pages ===\n`);

  const pageCount = pdf.getPageCount();
  const chunks: PDF[] = [];

  for (let start = 0; start < pageCount; start += pagesPerChunk) {
    const end = Math.min(start + pagesPerChunk, pageCount);
    const indices = Array.from({ length: end - start }, (_, i) => start + i);

    const chunk = await pdf.extractPages(indices);
    chunks.push(chunk);

    console.log(`Chunk ${chunks.length}: pages ${start + 1}-${end} (${indices.length} pages)`);
  }

  // Save all chunks
  console.log("\n=== Saving Chunks ===\n");

  for (let i = 0; i < chunks.length; i++) {
    const chunkBytes = await chunks[i].save();
    const outputPath = await saveOutput(
      `09-merging-and-splitting/split-chunk-${i + 1}.pdf`,
      chunkBytes,
    );
    console.log(`Chunk ${i + 1}: ${formatBytes(chunkBytes.length)} -> ${outputPath}`);
  }

  console.log("\n=== Split Complete ===");
  console.log(`Created ${chunks.length} files from ${pageCount} pages`);
}

main().catch(console.error);
