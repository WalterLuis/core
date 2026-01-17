/**
 * Example: Bulk Fill Form
 *
 * This example demonstrates using the `form.fill()` method to populate
 * multiple fields at once from a dictionary/object.
 *
 * Run: npx tsx examples/03-forms/bulk-fill-form.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Bulk filling form fields...\n");

  // Load a PDF with form fields
  const bytes = await loadFixture("forms", "fancy_fields.pdf");
  const pdf = await PDF.load(bytes);

  // Get the form
  const form = pdf.getForm();
  if (!form) {
    console.log("This PDF does not contain a form.");
    return;
  }

  // Show current field values
  console.log("=== Current Field Values ===");
  const fieldNames = form.getFieldNames();
  for (const name of fieldNames.slice(0, 10)) {
    const field = form.getField(name);
    if (field) {
      let value: string;
      switch (field.type) {
        case "text":
          value = form.getTextField(name)?.getValue() ?? "";
          break;
        case "checkbox":
          value = form.getCheckbox(name)?.isChecked() ? "checked" : "unchecked";
          break;
        case "radio":
          value = form.getRadioGroup(name)?.getValue() ?? "(none)";
          break;
        case "dropdown":
          value = form.getDropdown(name)?.getValue() ?? "";
          break;
        case "listbox":
          value = JSON.stringify(form.getListBox(name)?.getValue() ?? []);
          break;
        default:
          value = "(n/a)";
      }
      console.log(`  ${name} (${field.type}): ${value || "(empty)"}`);
    }
  }
  if (fieldNames.length > 10) {
    console.log(`  ... and ${fieldNames.length - 10} more fields`);
  }

  // Define values to fill
  // The keys should match field names in the PDF
  // The fill() method is lenient - it will skip fields that don't exist
  const formData: Record<string, string | boolean | string[]> = {
    // Text fields - these are common field names that might exist
    Name: "John Smith",
    FirstName: "John",
    LastName: "Smith",
    Email: "john.smith@example.com",
    Phone: "(555) 123-4567",
    Address: "123 Main Street",
    City: "New York",
    State: "NY",
    ZIP: "10001",
    Country: "USA",
    Date: new Date().toISOString().split("T")[0] ?? "",
    Comments: "This form was filled using the bulk fill method.",

    // Checkboxes - use boolean
    Agree: true,
    Subscribe: false,
    Newsletter: true,

    // Radio buttons - use the option name
    Gender: "Male",
    PaymentMethod: "CreditCard",

    // Dropdowns - use the option value
    Title: "Mr.",
    Department: "Engineering",

    // Listboxes - use array of values
    Interests: ["Technology", "Science"],
  };

  console.log("\n=== Bulk Filling Form ===");
  console.log(`Attempting to fill ${Object.keys(formData).length} fields...`);

  // Use the fill() method for bulk filling
  // This is lenient - it will skip fields that don't exist or have wrong types
  form.fill(formData);

  console.log("Fill operation completed.");

  // Show which fields were actually updated
  console.log("\n=== Updated Field Values ===");
  for (const name of fieldNames.slice(0, 10)) {
    const field = form.getField(name);
    if (field) {
      let value: string;
      switch (field.type) {
        case "text":
          value = form.getTextField(name)?.getValue() ?? "";
          break;
        case "checkbox":
          value = form.getCheckbox(name)?.isChecked() ? "checked" : "unchecked";
          break;
        case "radio":
          value = form.getRadioGroup(name)?.getValue() ?? "(none)";
          break;
        case "dropdown":
          value = form.getDropdown(name)?.getValue() ?? "";
          break;
        case "listbox":
          value = JSON.stringify(form.getListBox(name)?.getValue() ?? []);
          break;
        default:
          value = "(n/a)";
      }
      console.log(`  ${name} (${field.type}): ${value || "(empty)"}`);
    }
  }

  // Save the filled form
  console.log("\n=== Saving Filled Form ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("03-forms/bulk-filled-form.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  console.log("\n=== Done ===");
  console.log("The fill() method is useful for:");
  console.log("  - Populating forms from data sources (databases, APIs)");
  console.log("  - Template-based document generation");
  console.log("  - Processing multiple forms with the same data structure");
}

main().catch(console.error);
