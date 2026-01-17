/**
 * Example: Extract Attachment
 *
 * This example demonstrates extracting an embedded file attachment from
 * a PDF and saving it to disk.
 *
 * Run: npx tsx examples/08-attachments/extract-attachment.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Extracting attachment from PDF...\n");

  // Load a PDF with attachments
  const bytes = await loadFixture("attachments", "attachment.pdf");
  const pdf = await PDF.load(bytes);

  // List available attachments
  const attachments = pdf.getAttachments();
  console.log(`Found ${attachments.size} attachment(s):`);

  for (const [name, info] of attachments) {
    const sizeStr = info.size !== undefined ? formatBytes(info.size) : "unknown";
    console.log(`  - ${name} (${sizeStr})`);
  }

  if (attachments.size === 0) {
    console.log("\nNo attachments to extract.");
    return;
  }

  // Get the first attachment name
  const firstAttachmentName = attachments.keys().next().value;
  if (!firstAttachmentName) {
    return;
  }

  console.log(`\nExtracting: ${firstAttachmentName}`);

  // Extract the attachment data
  const attachmentData = pdf.getAttachment(firstAttachmentName);

  if (!attachmentData) {
    console.log("Failed to extract attachment data.");
    return;
  }

  console.log(`Extracted ${formatBytes(attachmentData.length)} bytes`);

  // Save the extracted file
  const outputPath = await saveOutput(
    `08-attachments/extracted-${firstAttachmentName}`,
    attachmentData,
  );
  console.log(`\nSaved to: ${outputPath}`);

  // Extract all attachments
  console.log("\n=== Extracting All Attachments ===");

  for (const [name] of attachments) {
    const data = pdf.getAttachment(name);
    if (data) {
      const path = await saveOutput(`08-attachments/all/${name}`, data);
      console.log(`Saved: ${path} (${formatBytes(data.length)})`);
    }
  }
}

main().catch(console.error);
