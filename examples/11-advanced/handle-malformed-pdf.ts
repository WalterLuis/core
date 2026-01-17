/**
 * Example: Handle Malformed PDFs
 *
 * This example demonstrates @libpdf/core's lenient parsing capabilities
 * for handling malformed or damaged PDF files.
 *
 * Run: npx tsx examples/11-advanced/handle-malformed-pdf.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes } from "../utils";

async function main() {
  console.log("Handling malformed PDFs...\n");

  console.log("=== Lenient Parsing Philosophy ===\n");

  console.log("@libpdf/core is designed to be 'super lenient' with malformed PDFs:");
  console.log("- Prioritizes opening files over strict spec compliance");
  console.log("- Falls back to brute-force parsing when standard parsing fails");
  console.log("- Collects warnings instead of throwing errors when possible");
  console.log("- Similar approach to Apache PDFBox\n");

  // Create a valid PDF for demonstration
  console.log("=== Creating Test Document ===\n");

  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });
  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Recovery Test Document", {
      x: 160,
      y: page.height - 100,
      size: 28,
      color: black,
    });
  }

  const bytes = await pdf.save();
  console.log(`Created valid PDF: ${formatBytes(bytes.length)}`);

  // Load and check status
  const loaded = await PDF.load(bytes);
  console.log(`\nDocument status after loading:`);
  console.log(`  Version: ${loaded.version}`);
  console.log(`  Page count: ${loaded.getPageCount()}`);
  console.log(`  Recovered via brute-force: ${loaded.recoveredViaBruteForce}`);
  console.log(`  Warnings: ${loaded.warnings.length}`);

  console.log("\n=== Loading with Lenient Mode ===\n");

  console.log("// Load with explicit lenient mode (default is already lenient)");
  console.log("const pdf = await PDF.load(bytes, { lenient: true });");
  console.log();
  console.log("// Check if recovery was needed");
  console.log("if (pdf.recoveredViaBruteForce) {");
  console.log("  console.log('PDF was recovered using brute-force parsing');");
  console.log("  // Consider saving a clean copy");
  console.log("  const cleanBytes = await pdf.save();");
  console.log("}");

  console.log("\n=== Checking for Warnings ===\n");

  console.log("// Warnings are collected during parsing and operations");
  console.log("const pdf = await PDF.load(bytes);");
  console.log();
  console.log("if (pdf.warnings.length > 0) {");
  console.log("  console.log('Warnings encountered:');");
  console.log("  for (const warning of pdf.warnings) {");
  // biome-ignore lint/suspicious/noTemplateCurlyInString: example code
  console.log("    console.log(`  - ${warning}`);");
  console.log("  }");
  console.log("}");

  // Show any actual warnings
  if (loaded.warnings.length > 0) {
    console.log("\nActual warnings from this document:");
    for (const warning of loaded.warnings) {
      console.log(`  - ${warning}`);
    }
  } else {
    console.log("\nNo warnings - this document is well-formed.");
  }

  console.log("\n=== Common Recovery Scenarios ===\n");

  console.log("The library handles these common issues:");
  console.log();
  console.log("1. Corrupted xref table:");
  console.log("   - Falls back to scanning file for 'obj' markers");
  console.log("   - Reconstructs xref from found objects");
  console.log();
  console.log("2. Missing or invalid trailer:");
  console.log("   - Searches for objects containing /Root");
  console.log("   - Constructs minimal trailer from found data");
  console.log();
  console.log("3. Truncated files:");
  console.log("   - Recovers as many objects as possible");
  console.log("   - Pages may be missing but file opens");
  console.log();
  console.log("4. Invalid object references:");
  console.log("   - Returns null for missing objects");
  console.log("   - Continues parsing other content");
  console.log();
  console.log("5. Encoding issues:");
  console.log("   - Handles various string encoding errors");
  console.log("   - Uses fallback encodings when needed");

  console.log("\n=== Incremental Save Limitations ===\n");

  console.log("Recovered PDFs cannot use incremental save because:");
  console.log("- Original xref structure may be corrupted");
  console.log("- Object positions might be incorrect");
  console.log("- Full rewrite ensures clean output");
  console.log();

  const canIncremental = loaded.canSaveIncrementally();
  console.log(
    `Can save incrementally: ${canIncremental === null ? "Yes" : `No (${canIncremental})`}`,
  );

  console.log("\n=== Best Practices ===\n");

  console.log("1. Always check recoveredViaBruteForce after loading");
  console.log("2. Review warnings for potential issues");
  console.log("3. Save a clean copy of recovered documents");
  console.log("4. Test critical operations on recovered PDFs");
  console.log("5. Consider re-exporting severely damaged PDFs");
}

main().catch(console.error);
