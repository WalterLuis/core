/**
 * Example: Concatenate with Cover Page
 *
 * This example demonstrates adding a cover page to an existing PDF,
 * or creating a combined document with a custom cover.
 *
 * Run: npx tsx examples/09-merging-and-splitting/concatenate-with-cover.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Concatenating PDF with cover page...\n");

  // Create a multi-page "content" PDF
  console.log("=== Creating Content Document ===\n");

  const contentPdf = PDF.create();
  for (let i = 1; i <= 5; i++) {
    contentPdf.addPage({ size: "letter" });
    const page = contentPdf.getPage(i - 1);
    if (page) {
      page.drawText(`Content Page ${i}`, {
        x: 200,
        y: page.height - 100,
        size: 28,
        color: black,
      });
      page.drawText("Lorem ipsum dolor sit amet, consectetur adipiscing elit.", {
        x: 72,
        y: page.height - 180,
        size: 12,
        color: black,
      });
    }
  }

  const contentBytes = await contentPdf.save();
  console.log(
    `Content document: ${contentPdf.getPageCount()} pages, ${formatBytes(contentBytes.length)}`,
  );

  // Create a cover page
  console.log("\n=== Creating Cover Page ===\n");

  const coverPdf = PDF.create();
  coverPdf.addPage({ size: "letter" });
  const coverPage = coverPdf.getPage(0);
  if (coverPage) {
    // Draw a colored background rectangle
    coverPage.drawRectangle({
      x: 0,
      y: 0,
      width: coverPage.width,
      height: coverPage.height,
      color: rgb(0.1, 0.2, 0.4), // Dark blue
    });

    // Title
    coverPage.drawText("Annual Report", {
      x: 150,
      y: coverPage.height - 300,
      size: 48,
      color: rgb(1, 1, 1), // White
    });

    // Subtitle
    coverPage.drawText("Fiscal Year 2024", {
      x: 200,
      y: coverPage.height - 360,
      size: 24,
      color: rgb(0.8, 0.8, 0.8), // Light gray
    });

    // Footer
    coverPage.drawText("ACME Corporation", {
      x: 220,
      y: 100,
      size: 18,
      color: rgb(0.7, 0.7, 0.7),
    });
  }

  const coverBytes = await coverPdf.save();
  console.log(`Cover page: ${formatBytes(coverBytes.length)}`);

  // Method 1: Merge cover + content
  console.log("\n=== Method 1: Merge Cover + Content ===\n");

  const merged = await PDF.merge([coverBytes, contentBytes]);
  console.log(`Merged document: ${merged.getPageCount()} pages`);

  const mergedBytes = await merged.save();
  const mergedPath = await saveOutput(
    "09-merging-and-splitting/with-cover-merged.pdf",
    mergedBytes,
  );
  console.log(`Output: ${mergedPath}`);
  console.log(`Size: ${formatBytes(mergedBytes.length)}`);

  // Method 2: Insert cover page at beginning of existing document
  console.log("\n=== Method 2: Insert Cover at Beginning ===\n");

  const existingDoc = await PDF.load(contentBytes);
  console.log(`Loaded document: ${existingDoc.getPageCount()} pages`);

  // Copy cover page into existing document at position 0
  const coverDoc = await PDF.load(coverBytes);
  await existingDoc.copyPagesFrom(coverDoc, [0], { insertAt: 0 });

  console.log(`After insert: ${existingDoc.getPageCount()} pages`);

  const insertedBytes = await existingDoc.save();
  const insertedPath = await saveOutput(
    "09-merging-and-splitting/with-cover-inserted.pdf",
    insertedBytes,
  );
  console.log(`Output: ${insertedPath}`);
  console.log(`Size: ${formatBytes(insertedBytes.length)}`);

  // Method 3: Add back cover too
  console.log("\n=== Method 3: Add Back Cover ===\n");

  // Create back cover
  const backCoverPdf = PDF.create();
  backCoverPdf.addPage({ size: "letter" });
  const backCoverPage = backCoverPdf.getPage(0);
  if (backCoverPage) {
    backCoverPage.drawRectangle({
      x: 0,
      y: 0,
      width: backCoverPage.width,
      height: backCoverPage.height,
      color: rgb(0.1, 0.2, 0.4),
    });
    backCoverPage.drawText("Thank you for reading", {
      x: 180,
      y: backCoverPage.height / 2,
      size: 24,
      color: rgb(1, 1, 1),
    });
  }
  const backCoverBytes = await backCoverPdf.save();

  // Merge: cover + content + back cover
  const fullDoc = await PDF.merge([coverBytes, contentBytes, backCoverBytes]);

  console.log(`Full document: ${fullDoc.getPageCount()} pages`);

  const fullBytes = await fullDoc.save();
  const fullPath = await saveOutput("09-merging-and-splitting/with-covers-full.pdf", fullBytes);
  console.log(`Output: ${fullPath}`);
  console.log(`Size: ${formatBytes(fullBytes.length)}`);

  console.log("\n=== Complete ===");
}

main().catch(console.error);
