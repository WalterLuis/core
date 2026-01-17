/**
 * Example: Load an Encrypted PDF
 *
 * This example demonstrates how to load a password-protected PDF by
 * providing credentials, then save an unencrypted copy.
 *
 * Run: npx tsx examples/01-basic/load-encrypted.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Loading encrypted PDF...\n");

  // Load an encrypted PDF fixture
  // PasswordSample-128bit.pdf uses: owner="owner", user="user"
  const bytes = await loadFixture("encryption", "PasswordSample-128bit.pdf");

  // Try loading without a password (will have limited access)
  console.log("=== Attempting without password ===");
  const pdfNoPassword = await PDF.load(bytes);
  console.log(`Encrypted: ${pdfNoPassword.isEncrypted}`);
  console.log(`Authenticated: ${pdfNoPassword.isAuthenticated}`);

  // Load with the owner password for full access
  console.log("\n=== Loading with owner password ===");
  const pdf = await PDF.load(bytes, {
    credentials: "owner",
  });

  console.log(`Encrypted: ${pdf.isEncrypted}`);
  console.log(`Authenticated: ${pdf.isAuthenticated}`);
  console.log(`Has owner access: ${pdf.hasOwnerAccess()}`);
  console.log(`Page Count: ${pdf.getPageCount()}`);

  // Show the page content is now accessible
  const page = pdf.getPage(0);
  if (page) {
    console.log(`\nPage 1 Size: ${page.width} x ${page.height} points`);
  }

  // Remove protection and save as unencrypted PDF
  console.log("\nRemoving protection and saving...");
  pdf.removeProtection();
  const decryptedBytes = await pdf.save();

  const outputPath = await saveOutput("01-basic/decrypted-document.pdf", decryptedBytes);

  console.log(`\n=== Saved Successfully ===`);
  console.log(`Original size: ${formatBytes(bytes.length)}`);
  console.log(`Decrypted size: ${formatBytes(decryptedBytes.length)}`);
  console.log(`Output: ${outputPath}`);

  // Verify the saved PDF is not encrypted
  const verifyPdf = await PDF.load(decryptedBytes);
  console.log(`\nVerification - Is encrypted: ${verifyPdf.isEncrypted}`);
}

main().catch(console.error);
