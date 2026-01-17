/**
 * Example: Detect PDF Linearization
 *
 * This example demonstrates checking if a PDF is linearized (optimized
 * for fast web viewing) and understanding what that means.
 *
 * Run: npx tsx examples/11-advanced/detect-linearization.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes } from "../utils";

async function main() {
  console.log("Detecting PDF linearization...\n");

  console.log("=== What is Linearization? ===\n");

  console.log("Linearized PDFs (also called 'Fast Web View' or 'Optimized'):");
  console.log("- First page data is at the beginning of the file");
  console.log("- Allows viewing the first page before full download");
  console.log("- Contains a linearization dictionary as the first object");
  console.log("- Has hint tables for efficient page access");
  console.log("- Common in PDFs from Adobe products\n");

  // Create a standard (non-linearized) PDF
  console.log("=== Creating Non-Linearized PDF ===\n");

  const pdf = PDF.create();
  for (let i = 1; i <= 3; i++) {
    pdf.addPage({ size: "letter" });
    const page = pdf.getPage(i - 1);
    if (page) {
      page.drawText(`Page ${i}`, {
        x: 250,
        y: page.height - 100,
        size: 36,
        color: black,
      });
    }
  }

  const bytes = await pdf.save();
  console.log(`Created PDF: ${formatBytes(bytes.length)}`);

  // Check linearization status
  const reloaded = await PDF.load(bytes);
  console.log(`\nLinearization status:`);
  console.log(`  isLinearized: ${reloaded.isLinearized}`);

  console.log("\n=== Implications for Incremental Save ===\n");

  console.log("Linearized PDFs and incremental save:");
  console.log("- Incremental save appends data to the end of the file");
  console.log("- This breaks the linearization structure");
  console.log("- @libpdf/core falls back to full save for linearized PDFs");
  console.log("- Use canSaveIncrementally() to check if incremental save is possible\n");

  const blocker = reloaded.canSaveIncrementally();
  console.log(`Can save incrementally: ${blocker === null ? "Yes" : `No (${blocker})`}`);

  console.log("\n=== Linearization Dictionary Structure ===\n");

  console.log("A linearization dictionary contains:");
  console.log("  /Linearized - Version number (e.g., 1.0)");
  console.log("  /L - File length");
  console.log("  /H - Hint stream offset and length");
  console.log("  /O - Object number of first page's page object");
  console.log("  /E - End of first page offset");
  console.log("  /N - Number of pages");
  console.log("  /T - Offset of first xref entry");

  console.log("\n=== Detecting Linearization in Practice ===\n");

  console.log("// Check if a PDF is linearized");
  console.log("const pdf = await PDF.load(bytes);");
  console.log("if (pdf.isLinearized) {");
  console.log("  console.log('PDF is optimized for web viewing');");
  console.log("  // Consider implications for modifications");
  console.log("}");

  console.log("\n=== Recovery Mode ===\n");

  console.log("Malformed PDFs might require brute-force recovery:");
  console.log(`  recoveredViaBruteForce: ${reloaded.recoveredViaBruteForce}`);

  if (reloaded.recoveredViaBruteForce) {
    console.log("\nRecovered PDFs cannot be saved incrementally because");
    console.log("the xref table structure may be corrupted or incomplete.");
  } else {
    console.log("\nPDF was parsed normally without recovery mode.");
  }

  console.log("\n=== Summary ===\n");

  console.log(`PDF Version: ${reloaded.version}`);
  console.log(`Page Count: ${reloaded.getPageCount()}`);
  console.log(`Linearized: ${reloaded.isLinearized}`);
  console.log(`Recovered: ${reloaded.recoveredViaBruteForce}`);
  console.log(`Encrypted: ${reloaded.isEncrypted}`);
  console.log(`Has Changes: ${reloaded.hasChanges()}`);
}

main().catch(console.error);
