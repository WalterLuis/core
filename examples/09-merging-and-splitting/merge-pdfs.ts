/**
 * Example: Merge PDFs
 *
 * This example demonstrates merging multiple PDF files into a single
 * combined document using PDF.merge().
 *
 * Run: npx tsx examples/09-merging-and-splitting/merge-pdfs.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Merging multiple PDFs...\n");

  // Create several source PDFs
  console.log("=== Creating Source PDFs ===\n");

  // Document 1
  const pdf1 = PDF.create();
  pdf1.addPage({ size: "letter" });
  const page1 = pdf1.getPage(0);
  if (page1) {
    page1.drawText("Document 1 - Cover Page", {
      x: 170,
      y: page1.height - 100,
      size: 24,
      color: black,
    });
    page1.drawText("This is the first document in the merge.", {
      x: 150,
      y: page1.height - 150,
      size: 14,
      color: black,
    });
  }
  const bytes1 = await pdf1.save();
  console.log(`Document 1: ${formatBytes(bytes1.length)} (1 page)`);

  // Document 2 (multiple pages)
  const pdf2 = PDF.create();
  for (let i = 1; i <= 3; i++) {
    pdf2.addPage({ size: "letter" });
    const page = pdf2.getPage(i - 1);
    if (page) {
      page.drawText(`Document 2 - Page ${i}`, {
        x: 190,
        y: page.height - 100,
        size: 24,
        color: black,
      });
    }
  }
  const bytes2 = await pdf2.save();
  console.log(`Document 2: ${formatBytes(bytes2.length)} (3 pages)`);

  // Document 3
  const pdf3 = PDF.create();
  pdf3.addPage({ size: "a4" }); // Different page size
  const page3 = pdf3.getPage(0);
  if (page3) {
    page3.drawText("Document 3 - A4 Size", {
      x: 180,
      y: page3.height - 100,
      size: 24,
      color: black,
    });
    page3.drawText("This document uses A4 paper size.", {
      x: 150,
      y: page3.height - 150,
      size: 14,
      color: black,
    });
  }
  const bytes3 = await pdf3.save();
  console.log(`Document 3: ${formatBytes(bytes3.length)} (1 page, A4)`);

  // Merge all documents
  console.log("\n=== Merging Documents ===\n");

  const merged = await PDF.merge([bytes1, bytes2, bytes3]);

  console.log(`Merged document: ${merged.getPageCount()} pages`);

  // Verify page dimensions
  const pages = merged.getPages();
  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (page) {
      console.log(`  Page ${i + 1}: ${page.width.toFixed(0)} x ${page.height.toFixed(0)} points`);
    }
  }

  // Save merged document
  const mergedBytes = await merged.save();
  const outputPath = await saveOutput("09-merging-and-splitting/merged.pdf", mergedBytes);

  console.log("\n=== Merge Complete ===");
  console.log(`Output: ${outputPath}`);
  console.log(`Total size: ${formatBytes(mergedBytes.length)}`);
  console.log(`Combined from: ${formatBytes(bytes1.length + bytes2.length + bytes3.length)}`);
}

main().catch(console.error);
