/**
 * Example: Fill Dropdowns and Listboxes
 *
 * This example demonstrates how to select options in dropdown (combo box)
 * and listbox fields in a PDF form.
 *
 * Run: npx tsx examples/03-forms/fill-dropdowns-and-listboxes.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Filling dropdowns and listboxes...\n");

  // Load a PDF with form fields
  const bytes = await loadFixture("forms", "fancy_fields.pdf");
  const pdf = await PDF.load(bytes);

  // Get the form
  const form = pdf.getForm();
  if (!form) {
    console.log("This PDF does not contain a form.");
    return;
  }

  // === Dropdowns ===
  console.log("=== Dropdowns (Combo Boxes) ===");
  const dropdowns = form.getDropdowns();

  if (dropdowns.length === 0) {
    console.log("No dropdowns found in this form.");
  } else {
    for (const dropdown of dropdowns) {
      console.log(`\nDropdown: "${dropdown.name}"`);

      // Show available options
      const options = dropdown.getOptions();
      const optionValues = options.map(o => o.value);
      console.log(
        `  Options: ${optionValues.slice(0, 5).join(", ")}${optionValues.length > 5 ? ` (${optionValues.length} total)` : ""}`,
      );

      // Show current value
      const currentValue = dropdown.getValue();
      console.log(`  Current value: "${currentValue || "(none)"}"`);

      // Show if editable
      console.log(`  Editable: ${dropdown.isEditable}`);

      // Skip if read-only
      if (dropdown.isReadOnly()) {
        console.log(`  (Read-only, skipping)`);
        continue;
      }

      // Select a different option
      if (optionValues.length > 0) {
        // Find an option that's not currently selected
        const newValue = optionValues.find(v => v !== currentValue) ?? optionValues[0];

        try {
          dropdown.setValue(newValue ?? "");
          console.log(`  -> Selected: "${newValue}"`);
        } catch (error) {
          console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  // === Listboxes ===
  console.log("\n=== Listboxes ===");
  const listboxes = form.getListBoxes();

  if (listboxes.length === 0) {
    console.log("No listboxes found in this form.");
  } else {
    for (const listbox of listboxes) {
      console.log(`\nListbox: "${listbox.name}"`);

      // Show available options
      const options = listbox.getOptions();
      const optionValues = options.map(o => o.value);
      console.log(
        `  Options: ${optionValues.slice(0, 5).join(", ")}${optionValues.length > 5 ? ` (${optionValues.length} total)` : ""}`,
      );

      // Show current selections
      const currentValues = listbox.getValue();
      console.log(`  Current selection(s): ${JSON.stringify(currentValues)}`);

      // Show if multi-select
      console.log(`  Multi-select: ${listbox.isMultiSelect}`);

      // Skip if read-only
      if (listbox.isReadOnly()) {
        console.log(`  (Read-only, skipping)`);
        continue;
      }

      // Select new option(s)
      if (optionValues.length > 0) {
        try {
          if (listbox.isMultiSelect && optionValues.length >= 2) {
            // Select multiple options
            const newValues = optionValues.slice(0, 2);
            listbox.setValue(newValues);
            console.log(`  -> Selected multiple: ${JSON.stringify(newValues)}`);
          } else {
            // Select single option
            const newValue = optionValues.find(v => !currentValues.includes(v)) ?? optionValues[0];
            listbox.setValue([newValue ?? ""]);
            console.log(`  -> Selected: "${newValue}"`);
          }
        } catch (error) {
          console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  // Save the modified form
  console.log("\n=== Saving Modified Form ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("03-forms/filled-dropdowns-listboxes.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Verify changes
  console.log("\n=== Verification ===");
  const verifyPdf = await PDF.load(savedBytes);
  const verifyForm = verifyPdf.getForm();

  if (verifyForm) {
    console.log("\nDropdown values:");
    for (const dd of verifyForm.getDropdowns()) {
      console.log(`  "${dd.name}": "${dd.getValue()}"`);
    }

    console.log("\nListbox values:");
    for (const lb of verifyForm.getListBoxes()) {
      console.log(`  "${lb.name}": ${JSON.stringify(lb.getValue())}`);
    }
  }
}

main().catch(console.error);
