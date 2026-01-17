/**
 * Example: Copy Pages Between Documents
 *
 * This example demonstrates how to copy pages from one PDF document
 * into another at a specific position.
 *
 * Run: npx tsx examples/02-pages/copy-pages-between-documents.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Copying pages between PDF documents...\n");

  // Create the source document
  console.log("=== Creating Source Document ===");
  const sourcePdf = PDF.create();

  for (let i = 1; i <= 3; i++) {
    sourcePdf.addPage({ size: "letter" });
  }

  // Label source pages
  const sourcePages = sourcePdf.getPages();
  for (let i = 0; i < sourcePages.length; i++) {
    const page = sourcePages[i];
    if (page) {
      page.drawText(`Source Page ${i + 1}`, {
        x: 180,
        y: 400,
        size: 48,
        color: black,
      });
      page.drawText("(Copied from another PDF)", {
        x: 150,
        y: 340,
        size: 24,
        color: black,
      });
    }
  }

  console.log(`Source document: ${sourcePdf.getPageCount()} pages`);

  // Create the target document
  console.log("\n=== Creating Target Document ===");
  const targetPdf = PDF.create();

  for (let i = 1; i <= 2; i++) {
    targetPdf.addPage({ size: "letter" });
  }

  // Label target pages
  const targetPages = targetPdf.getPages();
  for (let i = 0; i < targetPages.length; i++) {
    const page = targetPages[i];
    if (page) {
      page.drawText(`Target Page ${i + 1}`, {
        x: 180,
        y: 400,
        size: 48,
        color: black,
      });
      page.drawText("(Original page)", {
        x: 200,
        y: 340,
        size: 24,
        color: black,
      });
    }
  }

  console.log(`Target document: ${targetPdf.getPageCount()} pages`);

  // Copy all pages from source to the end of target
  console.log("\n=== Copying Pages ===");
  console.log("Copying all source pages to end of target...");

  // copyPagesFrom takes a PDF instance directly
  await targetPdf.copyPagesFrom(sourcePdf, [0, 1, 2]);

  console.log(`Target document now has: ${targetPdf.getPageCount()} pages`);
  console.log("Order: Target 1, Target 2, Source 1, Source 2, Source 3");

  // Save the combined document
  const combinedBytes = await targetPdf.save();
  const combinedPath = await saveOutput("02-pages/pages-copied-to-end.pdf", combinedBytes);

  console.log(`\nSaved: ${combinedPath}`);
  console.log(`Size: ${formatBytes(combinedBytes.length)}`);

  // Now demonstrate inserting pages at a specific position
  console.log("\n=== Inserting at Specific Position ===");

  const targetPdf2 = PDF.create();
  for (let i = 1; i <= 4; i++) {
    targetPdf2.addPage({ size: "letter" });
  }

  // Label these pages
  const targetPages2 = targetPdf2.getPages();
  for (let i = 0; i < targetPages2.length; i++) {
    const page = targetPages2[i];
    if (page) {
      page.drawText(`Original ${i + 1}`, {
        x: 220,
        y: 400,
        size: 48,
        color: black,
      });
    }
  }

  console.log(`Target document: ${targetPdf2.getPageCount()} pages`);
  console.log("Inserting source pages at position 2 (after page 2)...");

  await targetPdf2.copyPagesFrom(sourcePdf, [0, 1], { insertAt: 2 });

  console.log(`Target document now has: ${targetPdf2.getPageCount()} pages`);
  console.log("Order: Original 1, Original 2, Source 1, Source 2, Original 3, Original 4");

  const insertedBytes = await targetPdf2.save();
  const insertedPath = await saveOutput("02-pages/pages-inserted-middle.pdf", insertedBytes);

  console.log(`\nSaved: ${insertedPath}`);
  console.log(`Size: ${formatBytes(insertedBytes.length)}`);
}

main().catch(console.error);
