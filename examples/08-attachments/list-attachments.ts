/**
 * Example: List Attachments
 *
 * This example demonstrates loading a PDF and listing all embedded file
 * attachments with their names, sizes, and MIME types.
 *
 * Run: npx tsx examples/08-attachments/list-attachments.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture } from "../utils";

async function main() {
  console.log("Listing PDF attachments...\n");

  // Load a PDF with attachments
  const bytes = await loadFixture("attachments", "attachment.pdf");
  const pdf = await PDF.load(bytes);

  console.log("=== Document Info ===");
  console.log(`Page count: ${pdf.getPageCount()}`);

  // Get attachments (returns a Map<name, info>)
  const attachments = pdf.getAttachments();
  const attachmentCount = attachments.size;

  console.log(`\n=== Attachments (${attachmentCount}) ===`);

  if (attachmentCount === 0) {
    console.log("No attachments found.");
  } else {
    for (const [name, info] of attachments) {
      console.log(`\nName: ${name}`);
      console.log(`  Filename: ${info.filename}`);
      if (info.size !== undefined) {
        console.log(`  Size: ${formatBytes(info.size)}`);
      }
      if (info.mimeType) {
        console.log(`  MIME Type: ${info.mimeType}`);
      }
      if (info.description) {
        console.log(`  Description: ${info.description}`);
      }
      if (info.createdAt) {
        console.log(`  Created: ${info.createdAt.toISOString()}`);
      }
      if (info.modifiedAt) {
        console.log(`  Modified: ${info.modifiedAt.toISOString()}`);
      }
    }
  }

  // Also try another fixture with attachments
  console.log("\n=== Checking Another PDF ===");

  try {
    const bytes2 = await loadFixture("attachments", "embedded_zip.pdf");
    const pdf2 = await PDF.load(bytes2);
    const attachments2 = pdf2.getAttachments();

    console.log(`Found ${attachments2.size} attachment(s) in embedded_zip.pdf`);
    for (const [name, info] of attachments2) {
      const sizeStr = info.size !== undefined ? formatBytes(info.size) : "unknown size";
      console.log(`  - ${name} (${sizeStr})`);
    }
  } catch (error) {
    console.log(`Could not load: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().catch(console.error);
