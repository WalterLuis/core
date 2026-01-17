/**
 * Example: Highlight Template Tags
 *
 * This example demonstrates how to:
 * 1. Extract text from a PDF document
 * 2. Search for template tags using regex patterns
 * 3. Draw colored rectangles around found matches
 *
 * This is useful for visualizing template placeholders in PDF templates,
 * document automation, or debugging text extraction.
 *
 * Run: npx tsx examples/12-text-extraction/highlight-template-tags.ts
 */

import { PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Highlighting Template Tags in PDF\n");
  console.log("=".repeat(50));

  // Load the proposal PDF with template tags
  console.log("\n1. Loading proposal.pdf...");
  const bytes = await loadFixture("text", "proposal.pdf");
  const pdf = await PDF.load(bytes);

  console.log(`   Pages: ${pdf.getPageCount()}`);

  // Get the first page
  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Extract text to show what's in the document
  console.log("\n2. Extracting text...");
  const pageText = page.extractText();
  console.log(`   Total characters: ${pageText.text.length}`);
  console.log(`   Total lines: ${pageText.lines.length}`);

  // Search for template tags with {{ ... }} pattern
  console.log("\n3. Searching for template tags...");
  const matches = page.findText(/\{\{[^}]+\}\}/g);

  console.log(`   Found ${matches.length} template tags:\n`);

  // Define color for highlighting
  const borderColor = rgb(0.8, 0.2, 0.2); // Red border

  // Draw rectangles around each match
  for (const match of matches) {
    console.log(`   - "${match.text}"`);
    console.log(`     Position: (${match.bbox.x.toFixed(1)}, ${match.bbox.y.toFixed(1)})`);
    console.log(`     Size: ${match.bbox.width.toFixed(1)} x ${match.bbox.height.toFixed(1)}`);
    console.log("");

    // Draw a colored border rectangle around the text
    // The border highlights the template tag location
    page.drawRectangle({
      x: match.bbox.x - 2,
      y: match.bbox.y - 2,
      width: match.bbox.width + 4,
      height: match.bbox.height + 4,
      borderColor: borderColor,
      borderWidth: 2,
    });
  }

  // Save the modified PDF
  console.log("4. Saving highlighted PDF...");
  const outputBytes = await pdf.save();
  const outputPath = await saveOutput(
    "12-text-extraction/highlighted-template-tags.pdf",
    outputBytes,
  );

  console.log(`\n   Saved: ${outputPath}`);
  console.log(`   Size: ${formatBytes(outputBytes.length)}`);

  // Summary
  console.log(`\n${"=".repeat(50)}`);
  console.log("Summary:");
  console.log(`  - Found ${matches.length} template tags`);
  console.log("  - Each tag now has a red border rectangle");
  console.log("\nOpen the output PDF to see the highlighted template tags!");
}

main().catch(console.error);
