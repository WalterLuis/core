/**
 * Example: Remove Attachment
 *
 * This example demonstrates removing a specific attachment from a PDF.
 *
 * Run: npx tsx examples/08-attachments/remove-attachment.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Removing attachments from a PDF...\n");

  // Create a PDF with attachments first
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Attachment Removal Demo", {
      x: 180,
      y: page.height - 50,
      size: 24,
      color: black,
    });
  }

  // Add several attachments
  const attachmentsToAdd = [
    { name: "keep-me.txt", content: "This file will be kept." },
    { name: "delete-me.txt", content: "This file will be deleted." },
    { name: "also-keep.txt", content: "This file will also be kept." },
  ];

  console.log("=== Adding Attachments ===");
  for (const att of attachmentsToAdd) {
    const data = new TextEncoder().encode(att.content);
    pdf.addAttachment(att.name, data);
    console.log(`Added: ${att.name}`);
  }

  // List attachments before removal
  console.log("\n=== Before Removal ===");
  let attachments = pdf.getAttachments();
  console.log(`Attachment count: ${attachments.size}`);
  for (const [name] of attachments) {
    console.log(`  - ${name}`);
  }

  // Check if attachment exists
  const nameToRemove = "delete-me.txt";
  const exists = pdf.hasAttachment(nameToRemove);
  console.log(`\nHas "${nameToRemove}": ${exists}`);

  // Remove the attachment
  console.log(`\nRemoving: ${nameToRemove}`);
  pdf.removeAttachment(nameToRemove);

  // List attachments after removal
  console.log("\n=== After Removal ===");
  attachments = pdf.getAttachments();
  console.log(`Attachment count: ${attachments.size}`);
  for (const [name] of attachments) {
    console.log(`  - ${name}`);
  }

  // Verify removal
  const stillExists = pdf.hasAttachment(nameToRemove);
  console.log(`\nHas "${nameToRemove}": ${stillExists}`);

  // Save
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("08-attachments/after-removal.pdf", savedBytes);

  console.log("\n=== Document Saved ===");
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Try to remove non-existent attachment
  console.log("\n=== Removing Non-existent Attachment ===");
  try {
    pdf.removeAttachment("does-not-exist.txt");
    console.log("Unexpected success");
  } catch (error) {
    console.log(`Expected error: ${error instanceof Error ? error.message : String(error)}`);
  }
}

main().catch(console.error);
