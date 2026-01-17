/**
 * Example: Read PDF Permission Flags
 *
 * This example demonstrates reading permission flags from PDF documents.
 * Permission flags control what operations are allowed on encrypted PDFs.
 *
 * Run: npx tsx examples/10-security/permissions-info.ts
 */

import { black, PDF } from "../../src/index";

function main() {
  console.log("Reading PDF permission flags...\n");

  // PDF Permission Flags (from PDF spec Table 22)
  // These are typically only meaningful for encrypted documents
  const PERMISSIONS = {
    PRINT: 4, // Bit 3: Print the document
    MODIFY: 8, // Bit 4: Modify contents
    COPY: 16, // Bit 5: Copy text and graphics
    ANNOT_FORMS: 32, // Bit 6: Add/modify annotations, fill forms
    FILL_FORMS: 256, // Bit 9: Fill form fields
    EXTRACT: 512, // Bit 10: Extract text/graphics for accessibility
    ASSEMBLE: 1024, // Bit 11: Assemble document
    PRINT_HIGH: 2048, // Bit 12: High-quality print
  };

  console.log("=== PDF Permission Flags Reference ===\n");
  console.log("Bit  | Value | Permission");
  console.log("-----|-------|-----------------------------");
  console.log(" 3   |    4  | Print document");
  console.log(" 4   |    8  | Modify contents");
  console.log(" 5   |   16  | Copy text and graphics");
  console.log(" 6   |   32  | Add annotations, fill forms");
  console.log(" 9   |  256  | Fill form fields only");
  console.log("10   |  512  | Extract for accessibility");
  console.log("11   | 1024  | Assemble document");
  console.log("12   | 2048  | High-quality print");

  console.log("\n=== Checking Document Permissions ===\n");

  // Create a test PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });
  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Permission Test Document", {
      x: 150,
      y: page.height - 100,
      size: 24,
      color: black,
    });
  }

  // Check if document is encrypted
  console.log(`Document encrypted: ${pdf.isEncrypted}`);

  if (pdf.isEncrypted) {
    console.log("Reading permissions from Encrypt dictionary...");
    // In a real encrypted document, permissions would be in the Encrypt dict
  } else {
    console.log("Document is not encrypted - all operations permitted");
    console.log("\nFor unencrypted documents:");
    console.log("  - All permissions are implicitly granted");
    console.log("  - No password required for any operation");
  }

  console.log("\n=== How to Check Permissions ===\n");

  console.log("For encrypted PDFs, permissions are stored in the Encrypt dictionary:");
  console.log();
  console.log("  const catalog = pdf.getCatalog();");
  console.log("  // Access Encrypt dict from trailer");
  console.log("  const trailer = pdf.context.info.trailer;");
  console.log("  const encryptRef = trailer.getRef('Encrypt');");
  console.log("  if (encryptRef) {");
  console.log("    const encrypt = pdf.getObject(encryptRef);");
  console.log("    const P = encrypt.getNumber('P')?.value || 0;");
  console.log("    ");
  console.log("    // Check specific permissions");
  console.log("    const canPrint = (P & 4) !== 0;");
  console.log("    const canModify = (P & 8) !== 0;");
  console.log("    const canCopy = (P & 16) !== 0;");
  console.log("  }");

  console.log("\n=== Permission Flag Analysis Function ===\n");

  // Example function to analyze permission flags
  function analyzePermissions(P: number): void {
    console.log(`Permission value (P): ${P} (0x${P.toString(16)})`);
    console.log();
    console.log("Permissions:");
    console.log(`  Print:              ${(P & PERMISSIONS.PRINT) !== 0 ? "Allowed" : "Denied"}`);
    console.log(`  Modify:             ${(P & PERMISSIONS.MODIFY) !== 0 ? "Allowed" : "Denied"}`);
    console.log(`  Copy:               ${(P & PERMISSIONS.COPY) !== 0 ? "Allowed" : "Denied"}`);
    console.log(
      `  Annotations/Forms:  ${(P & PERMISSIONS.ANNOT_FORMS) !== 0 ? "Allowed" : "Denied"}`,
    );
    console.log(
      `  Fill Forms Only:    ${(P & PERMISSIONS.FILL_FORMS) !== 0 ? "Allowed" : "Denied"}`,
    );
    console.log(`  Extract:            ${(P & PERMISSIONS.EXTRACT) !== 0 ? "Allowed" : "Denied"}`);
    console.log(`  Assemble:           ${(P & PERMISSIONS.ASSEMBLE) !== 0 ? "Allowed" : "Denied"}`);
    console.log(
      `  High-Quality Print: ${(P & PERMISSIONS.PRINT_HIGH) !== 0 ? "Allowed" : "Denied"}`,
    );
  }

  // Example: Analyze common permission values
  console.log("Example: Full permissions (-1 or 0xFFFFFFFF):");
  analyzePermissions(-1); // All bits set = all permissions

  console.log("\nExample: Print and copy only (P = 4 | 16 = 20):");
  analyzePermissions(20);

  console.log("\n=== Notes ===");
  console.log("1. Permission flags only affect encrypted documents");
  console.log("2. These are advisory - viewers should respect them");
  console.log("3. Owner password bypasses all restrictions");
  console.log("4. User password respects the permission flags");
}

main();
