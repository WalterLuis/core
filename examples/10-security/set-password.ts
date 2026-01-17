/**
 * Example: Set Password Protection
 *
 * This example demonstrates how to add password protection to a PDF
 * using the setProtection() method, including setting permissions.
 *
 * Run: npx tsx examples/10-security/set-password.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Adding password protection to PDF...\n");

  // Create a new PDF
  console.log("=== Creating Test PDF ===\n");

  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Confidential Document", {
      x: 180,
      y: page.height - 100,
      size: 24,
      color: black,
    });

    page.drawText("This PDF is password protected.", {
      x: 170,
      y: page.height - 150,
      size: 14,
      color: black,
    });

    page.drawText("User password: secret", {
      x: 200,
      y: page.height - 200,
      size: 12,
      color: black,
    });

    page.drawText("Owner password: admin", {
      x: 195,
      y: page.height - 220,
      size: 12,
      color: black,
    });
  }

  // Add protection with passwords and permissions
  console.log("=== Adding Protection ===\n");

  pdf.setProtection({
    userPassword: "secret", // Required to open the document
    ownerPassword: "admin", // Required to change security settings
    permissions: {
      print: true, // Allow printing
      copy: false, // Disallow copying text
      modify: false, // Disallow modifying content
      annotate: true, // Allow adding annotations
      fillForms: true, // Allow filling form fields
      accessibility: false, // Disallow text extraction for accessibility
      assemble: false, // Disallow page assembly
      printHighQuality: true, // Allow high-quality printing
    },
    algorithm: "AES-256", // Use strongest encryption (default)
  });

  console.log("Protection settings:");
  console.log("  User password: secret");
  console.log("  Owner password: admin");
  console.log("  Algorithm: AES-256");
  console.log("  Permissions:");
  console.log("    - Print: allowed");
  console.log("    - Copy: denied");
  console.log("    - Modify: denied");
  console.log("    - Annotate: allowed");
  console.log("    - Fill forms: allowed");

  // Save the protected PDF
  const protectedBytes = await pdf.save();
  const outputPath = await saveOutput("10-security/protected.pdf", protectedBytes);

  console.log("\n=== Saved Protected PDF ===\n");
  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(protectedBytes.length)}`);

  // Verify the saved PDF is encrypted
  console.log("\n=== Verification ===\n");

  // Load without password - should be marked as not authenticated
  const pdfNoPassword = await PDF.load(protectedBytes);
  console.log("Without password:");
  console.log(`  Encrypted: ${pdfNoPassword.isEncrypted}`);
  console.log(`  Authenticated: ${pdfNoPassword.isAuthenticated}`);

  // Load with user password
  const pdfUserPassword = await PDF.load(protectedBytes, {
    credentials: "secret",
  });
  console.log("\nWith user password (secret):");
  console.log(`  Encrypted: ${pdfUserPassword.isEncrypted}`);
  console.log(`  Authenticated: ${pdfUserPassword.isAuthenticated}`);
  console.log(`  Has owner access: ${pdfUserPassword.hasOwnerAccess()}`);

  const userPermissions = pdfUserPassword.getPermissions();
  console.log(`  Can print: ${userPermissions.print}`);
  console.log(`  Can copy: ${userPermissions.copy}`);

  // Load with owner password
  const pdfOwnerPassword = await PDF.load(protectedBytes, {
    credentials: "admin",
  });
  console.log("\nWith owner password (admin):");
  console.log(`  Encrypted: ${pdfOwnerPassword.isEncrypted}`);
  console.log(`  Authenticated: ${pdfOwnerPassword.isAuthenticated}`);
  console.log(`  Has owner access: ${pdfOwnerPassword.hasOwnerAccess()}`);

  console.log("\n=== Notes ===");
  console.log("1. User password is required to open the document");
  console.log("2. Owner password grants full access and can change security");
  console.log("3. Permissions only affect user password access");
  console.log("4. AES-256 is the strongest encryption algorithm");
}

main().catch(console.error);
