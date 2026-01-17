/**
 * Example: Keywords
 *
 * This example demonstrates setting and retrieving document keywords as an
 * array, showing the automatic conversion between the array API and PDF's
 * space-separated string storage.
 *
 * Run: npx tsx examples/06-metadata/keywords.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Working with document keywords...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Document Keywords Example", {
      x: 170,
      y: page.height - 50,
      size: 20,
      color: black,
    });
  }

  // === Setting keywords as an array ===
  console.log("=== Setting Keywords ===\n");

  // Keywords are set as an array for convenience
  const keywords = ["PDF", "library", "TypeScript", "parsing", "generation"];

  pdf.setKeywords(keywords);
  console.log(`Set keywords: ${keywords.join(", ")}`);

  // Verify
  const retrieved = pdf.getKeywords();
  console.log(`Retrieved keywords: ${retrieved?.join(", ")}`);
  console.log(`Keyword count: ${retrieved?.length}`);

  // === Keywords are stored as space-separated string ===
  console.log("\n=== Storage Format ===");
  console.log("In the PDF, keywords are stored as a single space-separated string:");
  console.log(`  "PDF library TypeScript parsing generation"`);
  console.log("\nThe API presents them as an array for convenience:");
  console.log(`  ["PDF", "library", "TypeScript", "parsing", "generation"]`);

  // === Adding more keywords ===
  console.log("\n=== Modifying Keywords ===\n");

  // Get current keywords
  const current = pdf.getKeywords() ?? [];
  console.log(`Current: ${current.join(", ")}`);

  // Add new keywords
  const expanded = [...current, "document", "automation"];
  pdf.setKeywords(expanded);
  console.log(`Added: document, automation`);
  console.log(`New list: ${pdf.getKeywords()?.join(", ")}`);

  // === Removing keywords ===
  const filtered = (pdf.getKeywords() ?? []).filter(k => k !== "parsing");
  pdf.setKeywords(filtered);
  console.log(`\nRemoved 'parsing'`);
  console.log(`Result: ${pdf.getKeywords()?.join(", ")}`);

  // === Keywords for searchability ===
  console.log("\n=== Use Cases for Keywords ===");
  console.log("Keywords help with:");
  console.log("  - Document search and discovery");
  console.log("  - Categorization and tagging");
  console.log("  - SEO for indexed documents");
  console.log("  - Document management systems");

  // Add comprehensive keywords
  pdf.setKeywords([
    "PDF",
    "TypeScript",
    "JavaScript",
    "document",
    "generation",
    "parsing",
    "forms",
    "digital signatures",
    "metadata",
  ]);

  // Display on page
  if (page) {
    page.drawText("Keywords set:", {
      x: 50,
      y: page.height - 120,
      size: 12,
      color: black,
    });

    const finalKeywords = pdf.getKeywords() ?? [];
    let y = page.height - 145;
    for (const keyword of finalKeywords) {
      page.drawText(`  - ${keyword}`, {
        x: 60,
        y,
        size: 11,
        color: black,
      });
      y -= 18;
    }
  }

  // Save and reload
  console.log("\n=== Save and Verify ===\n");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("06-metadata/keywords-example.pdf", savedBytes);

  console.log(`Saved: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Verify persistence
  const reloaded = await PDF.load(savedBytes);
  const reloadedKeywords = reloaded.getKeywords();

  console.log(`\nKeywords after reload: ${reloadedKeywords?.join(", ")}`);

  // === Empty keywords ===
  console.log("\n=== Clearing Keywords ===");

  // Set to empty array
  pdf.setKeywords([]);
  console.log(`Set to empty array`);
  console.log(`Keywords now: ${JSON.stringify(pdf.getKeywords())}`);

  // Note: getKeywords() returns undefined if no keywords are set,
  // or an empty array if explicitly set to empty
}

main().catch(console.error);
