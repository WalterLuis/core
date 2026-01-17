/**
 * Example: Set Metadata
 *
 * This example demonstrates how to create a new PDF and set document
 * metadata fields individually using the setter methods.
 *
 * Run: npx tsx examples/06-metadata/set-metadata.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Setting document metadata...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  // Add some content
  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Document with Custom Metadata", {
      x: 150,
      y: page.height - 100,
      size: 20,
      color: black,
    });

    page.drawText("Open this PDF in a viewer and check 'Document Properties'", {
      x: 100,
      y: page.height - 150,
      size: 12,
      color: black,
    });

    page.drawText("to see the metadata we've set.", {
      x: 180,
      y: page.height - 170,
      size: 12,
      color: black,
    });
  }

  // Set metadata fields individually
  console.log("=== Setting Metadata Fields ===\n");

  // Set title
  pdf.setTitle("Annual Report 2024");
  console.log("Set title: Annual Report 2024");

  // Set author
  pdf.setAuthor("Jane Smith");
  console.log("Set author: Jane Smith");

  // Set subject
  pdf.setSubject("Company financial overview and performance analysis for fiscal year 2024");
  console.log("Set subject: Company financial overview...");

  // Set keywords as an array
  pdf.setKeywords(["finance", "annual report", "2024", "Q4", "financial statements"]);
  console.log("Set keywords: finance, annual report, 2024, Q4, financial statements");

  // Set creator (the application that created the content)
  pdf.setCreator("Report Generator v2.0");
  console.log("Set creator: Report Generator v2.0");

  // Set producer (the application that created the PDF)
  pdf.setProducer("@libpdf/core");
  console.log("Set producer: @libpdf/core");

  // Set creation date
  const creationDate = new Date("2024-12-15T10:30:00Z");
  pdf.setCreationDate(creationDate);
  console.log(`Set creation date: ${creationDate.toISOString()}`);

  // Set modification date
  const modDate = new Date();
  pdf.setModificationDate(modDate);
  console.log(`Set modification date: ${modDate.toISOString()}`);

  // Set language (RFC 3066 format)
  pdf.setLanguage("en-US");
  console.log("Set language: en-US");

  // Set trapped status
  pdf.setTrapped("False");
  console.log("Set trapped: False");

  // Verify the values were set
  console.log("\n=== Verifying Metadata ===\n");
  console.log("Title:", pdf.getTitle());
  console.log("Author:", pdf.getAuthor());
  console.log("Subject:", pdf.getSubject());
  console.log("Keywords:", pdf.getKeywords()?.join(", "));
  console.log("Creator:", pdf.getCreator());
  console.log("Producer:", pdf.getProducer());
  console.log("Creation Date:", pdf.getCreationDate()?.toISOString());
  console.log("Modification Date:", pdf.getModificationDate()?.toISOString());
  console.log("Language:", pdf.getLanguage());
  console.log("Trapped:", pdf.getTrapped());

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("06-metadata/document-with-metadata.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Verify metadata survives save/reload
  console.log("\n=== Verifying After Reload ===");
  const reloaded = await PDF.load(savedBytes);

  console.log("Title:", reloaded.getTitle());
  console.log("Author:", reloaded.getAuthor());
  console.log("Language:", reloaded.getLanguage());

  console.log("\n=== Done ===");
  console.log("Open the PDF in Adobe Reader or Preview and check Document Properties");
}

main().catch(console.error);
