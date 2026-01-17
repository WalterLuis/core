/**
 * Example: Search Text in PDF
 *
 * This example demonstrates how to:
 * 1. Search for text strings in a PDF
 * 2. Use regex patterns for advanced searching
 * 3. Get match positions and bounding boxes
 * 4. Search across multiple pages
 *
 * Run: npx tsx examples/12-text-extraction/search-text.ts
 */

import { PDF } from "../../src/index";
import { loadFixture } from "../utils";

async function main() {
  console.log("Searching Text in PDF\n");
  console.log("=".repeat(50));

  // Load the proposal PDF
  console.log("\n1. Loading proposal.pdf...");
  const bytes = await loadFixture("text", "proposal.pdf");
  const pdf = await PDF.load(bytes);

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Simple string search
  console.log("\n2. Searching for 'Lorem ipsum'...");
  const loremMatches = page.findText("Lorem ipsum");

  console.log(`   Found ${loremMatches.length} match(es):`);
  for (const match of loremMatches) {
    console.log(`   - "${match.text}" at (${match.bbox.x.toFixed(1)}, ${match.bbox.y.toFixed(1)})`);
  }

  // Case-insensitive search
  console.log("\n3. Case-insensitive search for 'LOREM'...");
  const caseInsensitiveMatches = page.findText("lorem", { caseSensitive: false });

  console.log(`   Found ${caseInsensitiveMatches.length} match(es):`);
  for (const match of caseInsensitiveMatches.slice(0, 5)) {
    console.log(`   - "${match.text}" at (${match.bbox.x.toFixed(1)}, ${match.bbox.y.toFixed(1)})`);
  }
  if (caseInsensitiveMatches.length > 5) {
    console.log(`   ... and ${caseInsensitiveMatches.length - 5} more`);
  }

  // Regex search - find template tags
  console.log("\n4. Regex search for template tags ({{ ... }})...");
  const tagMatches = page.findText(/\{\{\s*\w+[^}]*\}\}/g);

  console.log(`   Found ${tagMatches.length} template tag(s):`);
  for (const match of tagMatches) {
    console.log(`   - "${match.text}"`);
    console.log(`     Position: (${match.bbox.x.toFixed(1)}, ${match.bbox.y.toFixed(1)})`);
    console.log(`     Size: ${match.bbox.width.toFixed(1)} x ${match.bbox.height.toFixed(1)} pt`);
  }

  // Regex search - find words starting with capital letters
  console.log("\n5. Regex search for capitalized words...");
  const capitalizedMatches = page.findText(/\b[A-Z][a-z]+\b/g);

  console.log(`   Found ${capitalizedMatches.length} capitalized word(s):`);
  const uniqueWords = [...new Set(capitalizedMatches.map(m => m.text))];
  console.log(
    `   Unique words: ${uniqueWords.slice(0, 10).join(", ")}${uniqueWords.length > 10 ? "..." : ""}`,
  );

  // Document-wide search
  console.log("\n6. Document-wide search for 'volutpat'...");
  const docMatches = pdf.findText("volutpat");

  console.log(`   Found ${docMatches.length} match(es) across all pages:`);
  for (const match of docMatches) {
    console.log(
      `   - Page ${match.pageIndex + 1}: "${match.text}" at (${match.bbox.x.toFixed(1)}, ${match.bbox.y.toFixed(1)})`,
    );
  }

  // Whole word matching
  console.log("\n7. Whole word search for 'et'...");
  const wholeWordMatches = page.findText("et", { wholeWord: true });
  const partialMatches = page.findText("et", { wholeWord: false });

  console.log(`   Whole word matches: ${wholeWordMatches.length}`);
  console.log(
    `   Partial matches (includes 'amet', 'consectetuer', etc.): ${partialMatches.length}`,
  );

  console.log(`\n${"=".repeat(50)}`);
  console.log("Done!");
}

main().catch(console.error);
