/**
 * Example: Flatten Form
 *
 * This example demonstrates how to flatten a PDF form, converting all
 * form fields into static content that can no longer be edited.
 *
 * Flattening is useful when:
 * - You want to preserve the filled data as permanent content
 * - You want to prevent further editing of the form
 * - You need to reduce file size by removing form metadata
 * - You're preparing a document for archival or printing
 *
 * Run: npx tsx examples/03-forms/flatten-form.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Flattening a PDF form...\n");

  // Load a PDF with form fields
  const bytes = await loadFixture("forms", "form_to_flatten.pdf");
  const pdf = await PDF.load(bytes);

  // Get the form
  const form = pdf.getForm();
  if (!form) {
    console.log("This PDF does not contain a form.");
    return;
  }

  console.log("=== Before Flattening ===");
  console.log(`Has form: ${pdf.hasForm()}`);
  console.log(`Field count: ${form.fieldCount}`);
  console.log(`Field names: ${form.getFieldNames().join(", ")}`);

  // Fill some fields first so we have content to flatten
  console.log("\n=== Filling Form Fields ===");

  const textFields = form.getTextFields();
  for (const field of textFields) {
    if (!field.isReadOnly()) {
      try {
        field.setValue(`Filled: ${field.name}`);
        console.log(`  Filled "${field.name}"`);
      } catch {
        // Some fields may have restrictions
      }
    }
  }

  const checkboxes = form.getCheckboxes();
  for (const cb of checkboxes) {
    if (!cb.isReadOnly()) {
      try {
        cb.check();
        console.log(`  Checked "${cb.name}"`);
      } catch {
        // Ignore errors
      }
    }
  }

  // Flatten the form
  console.log("\n=== Flattening Form ===");
  console.log("Converting form fields to static content...");

  form.flatten();

  console.log("Form flattened successfully!");

  // Check the result
  console.log("\n=== After Flattening ===");
  console.log(`Has form: ${pdf.hasForm()}`);

  // The form should now be empty or removed
  const formAfter = pdf.getForm();
  if (formAfter) {
    console.log(`Field count: ${formAfter.fieldCount}`);
  } else {
    console.log("Form has been removed from the document.");
  }

  // Save the flattened document
  console.log("\n=== Saving Flattened Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("03-forms/flattened-form.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Original size: ${formatBytes(bytes.length)}`);
  console.log(`Flattened size: ${formatBytes(savedBytes.length)}`);

  // Verify the flattened document
  console.log("\n=== Verification ===");
  const verifyPdf = await PDF.load(savedBytes);
  console.log(`Page count: ${verifyPdf.getPageCount()}`);

  if (verifyPdf.hasForm()) {
    const verifyForm = verifyPdf.getForm();
    console.log(`Remaining fields: ${verifyForm?.fieldCount ?? 0}`);
  } else {
    console.log("No form found (completely flattened)");
  }

  console.log("\n=== Notes ===");
  console.log("After flattening:");
  console.log("  - Form field values are rendered as static text/graphics");
  console.log("  - Fields can no longer be edited");
  console.log("  - The visual appearance is preserved");
  console.log("  - File size may be reduced (no form metadata)");
}

main().catch(console.error);
