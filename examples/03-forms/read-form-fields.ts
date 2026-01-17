/**
 * Example: Read Form Fields
 *
 * This example demonstrates how to load a PDF with form fields, iterate
 * through all fields, and print their names, types, and current values.
 *
 * Run: npx tsx examples/03-forms/read-form-fields.ts
 */

import { PDF } from "../../src/index";
import { loadFixture } from "../utils";

async function main() {
  console.log("Reading form fields from a PDF...\n");

  // Load a PDF with form fields
  const bytes = await loadFixture("forms", "fancy_fields.pdf");
  const pdf = await PDF.load(bytes);

  // Check if the document has a form
  if (!pdf.hasForm()) {
    console.log("This PDF does not contain a form.");
    return;
  }

  // Get the form
  const form = pdf.getForm();
  if (!form) {
    console.log("Could not load form.");
    return;
  }

  console.log("=== Form Overview ===");
  console.log(`Total fields: ${form.fieldCount}`);
  console.log(`Is empty: ${form.isEmpty}`);
  console.log("");

  // Get all field names
  const fieldNames = form.getFieldNames();
  console.log("=== Field Names ===");
  for (const name of fieldNames) {
    console.log(`  - ${name}`);
  }
  console.log("");

  // Iterate through all fields and show their details
  console.log("=== Field Details ===\n");
  const fields = form.getFields();

  for (const field of fields) {
    console.log(`Field: "${field.name}"`);
    console.log(`  Type: ${field.type}`);
    console.log(`  Read-only: ${field.isReadOnly()}`);
    console.log(`  Required: ${field.isRequired()}`);

    // Show type-specific information
    switch (field.type) {
      case "text": {
        const textField = form.getTextField(field.name);
        if (textField) {
          const value = textField.getValue();
          console.log(`  Value: "${value ?? "(empty)"}"`);
          console.log(`  Max length: ${textField.maxLength ?? "unlimited"}`);
          console.log(`  Multiline: ${textField.isMultiline}`);
        }
        break;
      }

      case "checkbox": {
        const checkbox = form.getCheckbox(field.name);
        if (checkbox) {
          console.log(`  Checked: ${checkbox.isChecked()}`);
        }
        break;
      }

      case "radio": {
        const radioGroup = form.getRadioGroup(field.name);
        if (radioGroup) {
          const selected = radioGroup.getValue();
          const options = radioGroup.getOptions();
          console.log(`  Selected: "${selected ?? "(none)"}"`);
          console.log(`  Options: ${options.join(", ")}`);
        }
        break;
      }

      case "dropdown": {
        const dropdown = form.getDropdown(field.name);
        if (dropdown) {
          const value = dropdown.getValue();
          const options = dropdown.getOptions();
          const optionValues = options.map(o => o.value);
          console.log(`  Value: "${value || "(none)"}"`);
          console.log(
            `  Options: ${optionValues.slice(0, 5).join(", ")}${optionValues.length > 5 ? "..." : ""}`,
          );
          console.log(`  Editable: ${dropdown.isEditable}`);
        }
        break;
      }

      case "listbox": {
        const listbox = form.getListBox(field.name);
        if (listbox) {
          const selected = listbox.getValue();
          const options = listbox.getOptions();
          const optionValues = options.map(o => o.value);
          console.log(`  Selected: ${JSON.stringify(selected)}`);
          console.log(
            `  Options: ${optionValues.slice(0, 5).join(", ")}${optionValues.length > 5 ? "..." : ""}`,
          );
          console.log(`  Multi-select: ${listbox.isMultiSelect}`);
        }
        break;
      }

      case "signature": {
        const sigField = form.getSignatureField(field.name);
        if (sigField) {
          console.log(`  Signed: ${sigField.isSigned()}`);
        }
        break;
      }

      case "button": {
        console.log(`  (Button field - no value)`);
        break;
      }
    }

    console.log("");
  }

  // Show field counts by type
  console.log("=== Field Counts by Type ===");
  console.log(`  Text fields: ${form.getTextFields().length}`);
  console.log(`  Checkboxes: ${form.getCheckboxes().length}`);
  console.log(`  Radio groups: ${form.getRadioGroups().length}`);
  console.log(`  Dropdowns: ${form.getDropdowns().length}`);
  console.log(`  Listboxes: ${form.getListBoxes().length}`);
  console.log(`  Signature fields: ${form.getSignatureFields().length}`);
  console.log(`  Buttons: ${form.getButtons().length}`);
}

main().catch(console.error);
