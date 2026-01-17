/**
 * Example: Load and Inspect a PDF
 *
 * This example demonstrates how to load a PDF file and inspect its basic
 * properties like page count, page sizes, and encryption status.
 *
 * Run: npx tsx examples/01-basic/load-and-inspect.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture } from "../utils";

async function main() {
  // Load a PDF from the fixtures directory
  console.log("Loading PDF...\n");
  const bytes = await loadFixture("basic", "rot0.pdf");
  const pdf = await PDF.load(bytes);

  // Print basic document info
  console.log("=== Document Properties ===");
  console.log(`PDF Version: ${pdf.version}`);
  console.log(`File Size: ${formatBytes(bytes.length)}`);
  console.log(`Page Count: ${pdf.getPageCount()}`);
  console.log(`Encrypted: ${pdf.isEncrypted ? "Yes" : "No"}`);
  console.log(`Linearized: ${pdf.isLinearized ? "Yes" : "No"}`);
  console.log(`Uses XRef Streams: ${pdf.usesXRefStreams ? "Yes" : "No"}`);

  // Check for any parsing warnings
  if (pdf.warnings.length > 0) {
    console.log(`\nWarnings: ${pdf.warnings.length}`);
    for (const warning of pdf.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  // Iterate through pages and show dimensions
  console.log("\n=== Page Information ===");
  const pages = pdf.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) {
      continue;
    }

    console.log(`\nPage ${i + 1}:`);
    console.log(`  Size: ${page.width.toFixed(2)} x ${page.height.toFixed(2)} points`);
    console.log(
      `  Size (inches): ${(page.width / 72).toFixed(2)} x ${(page.height / 72).toFixed(2)}`,
    );
    console.log(`  Rotation: ${page.rotation} degrees`);
    console.log(`  Orientation: ${page.isLandscape ? "Landscape" : "Portrait"}`);

    // Show page boxes (using x1/y1/x2/y2 coordinates)
    const mediaBox = page.getMediaBox();
    const cropBox = page.getCropBox();

    const mediaX2 = mediaBox.x + mediaBox.width;
    const mediaY2 = mediaBox.y + mediaBox.height;

    console.log(
      `  Media Box: [${mediaBox.x}, ${mediaBox.y}, ${mediaX2}, ${mediaY2}] (${mediaBox.width} x ${mediaBox.height})`,
    );

    // Show crop box if different from media box
    if (
      cropBox.x !== mediaBox.x ||
      cropBox.y !== mediaBox.y ||
      cropBox.width !== mediaBox.width ||
      cropBox.height !== mediaBox.height
    ) {
      const cropX2 = cropBox.x + cropBox.width;
      const cropY2 = cropBox.y + cropBox.height;
      console.log(
        `  Crop Box: [${cropBox.x}, ${cropBox.y}, ${cropX2}, ${cropY2}] (${cropBox.width} x ${cropBox.height})`,
      );
    }
  }

  // Show metadata if available
  console.log("\n=== Document Metadata ===");
  const title = pdf.getTitle();
  const author = pdf.getAuthor();
  const subject = pdf.getSubject();
  const creator = pdf.getCreator();
  const producer = pdf.getProducer();
  const creationDate = pdf.getCreationDate();
  const modificationDate = pdf.getModificationDate();

  console.log(`Title: ${title ?? "(not set)"}`);
  console.log(`Author: ${author ?? "(not set)"}`);
  console.log(`Subject: ${subject ?? "(not set)"}`);
  console.log(`Creator: ${creator ?? "(not set)"}`);
  console.log(`Producer: ${producer ?? "(not set)"}`);
  console.log(`Created: ${creationDate?.toISOString() ?? "(not set)"}`);
  console.log(`Modified: ${modificationDate?.toISOString() ?? "(not set)"}`);

  console.log("\n=== Done ===");
}

main().catch(console.error);
