/**
 * Example: Extract Text from PDF
 *
 * This example demonstrates how to:
 * 1. Load a PDF document
 * 2. Extract all text from pages
 * 3. Access text with line structure
 * 4. Get bounding box positions for text
 *
 * Run: npx tsx examples/12-text-extraction/extract-text.ts
 */

import { PDF } from "../../src/index";
import { loadFixture } from "../utils";

async function main() {
  console.log("Extracting Text from PDF\n");
  console.log("=".repeat(50));

  // Load the proposal PDF
  console.log("\n1. Loading proposal.pdf...");
  const bytes = await loadFixture("text", "proposal.pdf");
  const pdf = await PDF.load(bytes);

  console.log(`   Pages: ${pdf.getPageCount()}`);

  // Extract text from the first page
  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  console.log("\n2. Extracting text from page 1...");
  const pageText = page.extractText();

  // Basic info
  console.log(`\n   Page dimensions: ${pageText.width} x ${pageText.height} pt`);
  console.log(`   Total characters: ${pageText.text.length}`);
  console.log(`   Total lines: ${pageText.lines.length}`);

  // Show the plain text
  console.log("\n3. Plain text content:");
  console.log("-".repeat(50));
  console.log(pageText.text);
  console.log("-".repeat(50));

  // Show line structure with positions
  console.log("\n4. Line structure with positions:");
  console.log("-".repeat(50));

  for (let i = 0; i < Math.min(10, pageText.lines.length); i++) {
    const line = pageText.lines[i];
    const truncatedText = line.text.length > 60 ? `${line.text.slice(0, 57)}...` : line.text;

    console.log(`Line ${i + 1}: "${truncatedText}"`);
    console.log(`         Position: (${line.bbox.x.toFixed(1)}, ${line.bbox.y.toFixed(1)})`);
    console.log(`         Size: ${line.bbox.width.toFixed(1)} x ${line.bbox.height.toFixed(1)} pt`);
    console.log(`         Spans: ${line.spans.length}, Font: ${line.spans[0]?.fontName || "N/A"}`);
    console.log("");
  }

  if (pageText.lines.length > 10) {
    console.log(`... and ${pageText.lines.length - 10} more lines`);
  }

  // Extract text from all pages (document-wide)
  console.log("\n5. Document-wide text extraction:");
  const allPages = pdf.extractText();
  console.log(`   Extracted text from ${allPages.length} page(s)`);

  let totalChars = 0;
  for (const pageData of allPages) {
    totalChars += pageData.text.length;
  }
  console.log(`   Total characters across all pages: ${totalChars}`);

  console.log(`\n${"=".repeat(50)}`);
  console.log("Done!");
}

main().catch(console.error);
