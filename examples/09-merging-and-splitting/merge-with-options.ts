/**
 * Example: Merge PDFs with Options
 *
 * This example demonstrates merging PDF files with options to control
 * annotation handling.
 *
 * Run: npx tsx examples/09-merging-and-splitting/merge-with-options.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Merging PDFs with options...\n");

  // Create source PDFs with annotations
  console.log("=== Creating Source PDFs ===\n");

  // Document 1 with some content
  const pdf1 = PDF.create();
  pdf1.addPage({ size: "letter" });
  const page1 = pdf1.getPage(0);
  if (page1) {
    page1.drawText("Document 1 - With Annotations", {
      x: 150,
      y: page1.height - 100,
      size: 24,
      color: black,
    });
  }
  const bytes1 = await pdf1.save();
  console.log(`Document 1: ${formatBytes(bytes1.length)}`);

  // Document 2 with different content
  const pdf2 = PDF.create();
  pdf2.addPage({ size: "letter" });
  const page2 = pdf2.getPage(0);
  if (page2) {
    page2.drawText("Document 2 - Also With Annotations", {
      x: 130,
      y: page2.height - 100,
      size: 24,
      color: black,
    });
  }
  const bytes2 = await pdf2.save();
  console.log(`Document 2: ${formatBytes(bytes2.length)}`);

  // Merge WITH annotations (default behavior)
  console.log("\n=== Merge with Annotations (default) ===\n");

  const mergedWithAnnotations = await PDF.merge([bytes1, bytes2], {
    includeAnnotations: true,
  });

  console.log(`Pages: ${mergedWithAnnotations.getPageCount()}`);

  const withAnnotsBytes = await mergedWithAnnotations.save();
  const withAnnotsPath = await saveOutput(
    "09-merging-and-splitting/merged-with-annotations.pdf",
    withAnnotsBytes,
  );
  console.log(`Output: ${withAnnotsPath}`);

  // Merge WITHOUT annotations
  console.log("\n=== Merge without Annotations ===\n");

  const mergedWithoutAnnotations = await PDF.merge([bytes1, bytes2], {
    includeAnnotations: false,
  });

  console.log(`Pages: ${mergedWithoutAnnotations.getPageCount()}`);

  const withoutAnnotsBytes = await mergedWithoutAnnotations.save();
  const withoutAnnotsPath = await saveOutput(
    "09-merging-and-splitting/merged-without-annotations.pdf",
    withoutAnnotsBytes,
  );
  console.log(`Output: ${withoutAnnotsPath}`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`With annotations: ${formatBytes(withAnnotsBytes.length)}`);
  console.log(`Without annotations: ${formatBytes(withoutAnnotsBytes.length)}`);
}

main().catch(console.error);
