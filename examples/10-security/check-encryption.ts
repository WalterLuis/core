/**
 * Example: Check PDF Encryption Status
 *
 * This example demonstrates how to check if a PDF is encrypted
 * and inspect its security properties.
 *
 * Run: npx tsx examples/10-security/check-encryption.ts
 */

import { black, PDF } from "../../src/index";

async function main() {
  console.log("Checking PDF encryption status...\n");

  // Create a simple unencrypted PDF for testing
  console.log("=== Creating Test PDF ===\n");

  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });
  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Test Document", {
      x: 200,
      y: page.height - 100,
      size: 24,
      color: black,
    });
  }
  const bytes = await pdf.save();

  // Load and check unencrypted PDF
  console.log("=== Checking Unencrypted PDF ===\n");

  const loadedPdf = await PDF.load(bytes);
  checkEncryptionStatus(loadedPdf, "Test PDF");

  // Try to load an encrypted PDF (if available)
  console.log("\n=== Trying to Load Encrypted PDF ===\n");

  try {
    // Note: This would require an actual encrypted PDF fixture
    // For demonstration, we show what the check would look like
    console.log("To check an encrypted PDF:");
    console.log("  const encryptedPdf = await PDF.load(bytes, {");
    console.log("    credentials: { password: 'secret' }");
    console.log("  });");
    console.log();
    console.log("  // Check if encryption was used");
    console.log("  console.log('Encrypted:', encryptedPdf.isEncrypted);");
    console.log("  console.log('Authenticated:', encryptedPdf.isAuthenticated);");
  } catch (err) {
    console.log(`Error: ${String(err)}`);
  }

  console.log("\n=== Summary ===");
  console.log("Use pdf.isEncrypted to check if a document is encrypted");
  console.log("Use pdf.isAuthenticated to verify password authentication");
}

function checkEncryptionStatus(pdf: PDF, name: string): void {
  console.log(`Document: ${name}`);
  console.log(`  Encrypted: ${pdf.isEncrypted}`);
  console.log(`  Authenticated: ${pdf.isAuthenticated}`);
  console.log(`  Version: ${pdf.version}`);
  console.log(`  Page count: ${pdf.getPageCount()}`);

  if (pdf.isEncrypted && pdf.isAuthenticated) {
    console.log("  Status: Encrypted document successfully opened");
  } else if (pdf.isEncrypted && !pdf.isAuthenticated) {
    console.log("  Status: Encrypted document - authentication failed");
  } else {
    console.log("  Status: Unencrypted document");
  }
}

main().catch(console.error);
