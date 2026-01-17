/**
 * Example: Add Attachment
 *
 * This example demonstrates embedding a file as an attachment in a PDF.
 *
 * Run: npx tsx examples/08-attachments/add-attachment.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Adding attachments to a PDF...\n");

  // Create a document
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Document with Attachments", {
      x: 170,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText("This PDF has embedded file attachments.", {
      x: 150,
      y: page.height - 100,
      size: 14,
      color: black,
    });

    page.drawText("View them in Adobe Reader under View > Show/Hide > Navigation > Attachments", {
      x: 50,
      y: page.height - 150,
      size: 11,
      color: black,
    });
  }

  // Create some sample data to attach
  const jsonData = JSON.stringify(
    {
      name: "Sample Data",
      version: "1.0.0",
      items: [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
        { id: 3, name: "Item 3" },
      ],
    },
    null,
    2,
  );
  const jsonBytes = new TextEncoder().encode(jsonData);

  // Add JSON attachment
  console.log("Adding JSON attachment...");
  pdf.addAttachment("data.json", jsonBytes, {
    description: "Sample JSON data file",
    mimeType: "application/json",
  });
  console.log(`Added: data.json (${formatBytes(jsonBytes.length)})`);

  // Add a text file
  const textContent = `README
======

This is a sample text file attachment.

Created: ${new Date().toISOString()}
Purpose: Demonstration of PDF attachments
`;
  const textBytes = new TextEncoder().encode(textContent);

  console.log("Adding text attachment...");
  pdf.addAttachment("README.txt", textBytes, {
    description: "Documentation file",
    mimeType: "text/plain",
  });
  console.log(`Added: README.txt (${formatBytes(textBytes.length)})`);

  // Add a CSV file
  const csvContent = `id,name,value
1,Alpha,100
2,Beta,200
3,Gamma,300
4,Delta,400
`;
  const csvBytes = new TextEncoder().encode(csvContent);

  console.log("Adding CSV attachment...");
  pdf.addAttachment("report.csv", csvBytes, {
    description: "Report data in CSV format",
    mimeType: "text/csv",
  });
  console.log(`Added: report.csv (${formatBytes(csvBytes.length)})`);

  // Verify attachments
  console.log("\n=== Attached Files ===");
  const attachments = pdf.getAttachments();

  for (const [name, info] of attachments) {
    const sizeStr = info.size !== undefined ? formatBytes(info.size) : "unknown";
    console.log(`  - ${name} (${sizeStr})`);
    if (info.description) {
      console.log(`    Description: ${info.description}`);
    }
  }

  // Save
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("08-attachments/with-attachments.pdf", savedBytes);

  console.log("\n=== Document Saved ===");
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);
}

main().catch(console.error);
