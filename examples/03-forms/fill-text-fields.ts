/**
 * Example: Fill Text Fields
 *
 * This example demonstrates how to load a PDF form and fill text fields
 * with values, then save the filled form.
 *
 * Run: npx tsx examples/03-forms/fill-text-fields.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Filling text fields in a PDF form...\n");

  // Load a PDF with form fields
  const bytes = await loadFixture("forms", "fancy_fields.pdf");
  const pdf = await PDF.load(bytes);

  // Get the form
  const form = pdf.getForm();
  if (!form) {
    console.log("This PDF does not contain a form.");
    return;
  }

  // List all text fields
  const textFields = form.getTextFields();
  console.log("=== Available Text Fields ===");
  for (const field of textFields) {
    console.log(`  - "${field.name}" (current: "${field.getValue() || "(empty)"}")`);
  }
  console.log("");

  // Fill text fields by name
  console.log("=== Filling Text Fields ===");

  for (const field of textFields) {
    // Get the field by name
    const textField = form.getTextField(field.name);
    if (!textField) {
      continue;
    }

    // Skip read-only fields
    if (field.isReadOnly()) {
      console.log(`Skipping "${field.name}" - read-only`);
      continue;
    }

    // Generate a sample value based on field name
    let value: string;
    const nameLower = field.name.toLowerCase();

    if (nameLower.includes("name")) {
      value = "John Doe";
    } else if (nameLower.includes("email")) {
      value = "john.doe@example.com";
    } else if (nameLower.includes("phone") || nameLower.includes("tel")) {
      value = "(555) 123-4567";
    } else if (nameLower.includes("address")) {
      value = "123 Main Street";
    } else if (nameLower.includes("city")) {
      value = "Springfield";
    } else if (nameLower.includes("state")) {
      value = "IL";
    } else if (nameLower.includes("zip") || nameLower.includes("postal")) {
      value = "62701";
    } else if (nameLower.includes("date")) {
      value = new Date().toISOString().split("T")[0] ?? "";
    } else if (nameLower.includes("comment") || nameLower.includes("note")) {
      value = "This is a sample comment.\nWith multiple lines.";
    } else {
      value = `Sample value for ${field.name}`;
    }

    // Respect max length if set
    if (textField.maxLength && value.length > textField.maxLength) {
      value = value.substring(0, textField.maxLength);
    }

    try {
      textField.setValue(value);
      console.log(`Set "${field.name}" = "${value}"`);
    } catch (error) {
      console.log(
        `Failed to set "${field.name}": ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Save the filled form
  console.log("\n=== Saving Filled Form ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("03-forms/filled-text-fields.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Verify the values were saved
  console.log("\n=== Verification ===");
  const verifyPdf = await PDF.load(savedBytes);
  const verifyForm = verifyPdf.getForm();

  if (verifyForm) {
    for (const field of verifyForm.getTextFields()) {
      console.log(`  "${field.name}" = "${field.getValue()}"`);
    }
  }
}

main().catch(console.error);
