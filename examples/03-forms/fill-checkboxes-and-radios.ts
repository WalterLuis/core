/**
 * Example: Fill Checkboxes and Radio Buttons
 *
 * This example demonstrates how to programmatically check/uncheck checkboxes
 * and select radio button options in a PDF form.
 *
 * Run: npx tsx examples/03-forms/fill-checkboxes-and-radios.ts
 */

import { PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Filling checkboxes and radio buttons...\n");

  // Load a PDF with form fields
  const bytes = await loadFixture("forms", "fancy_fields.pdf");
  const pdf = await PDF.load(bytes);

  // Get the form
  const form = pdf.getForm();
  if (!form) {
    console.log("This PDF does not contain a form.");
    return;
  }

  // === Checkboxes ===
  console.log("=== Checkboxes ===");
  const checkboxes = form.getCheckboxes();

  if (checkboxes.length === 0) {
    console.log("No checkboxes found in this form.");
  } else {
    for (const checkbox of checkboxes) {
      console.log(`\nCheckbox: "${checkbox.name}"`);
      console.log(`  Current state: ${checkbox.isChecked() ? "checked" : "unchecked"}`);

      // Toggle the checkbox
      if (checkbox.isReadOnly()) {
        console.log(`  (Read-only, skipping)`);
        continue;
      }

      try {
        if (checkbox.isChecked()) {
          // Uncheck it
          checkbox.uncheck();
          console.log(`  -> Unchecked`);
        } else {
          // Check it
          checkbox.check();
          console.log(`  -> Checked`);
        }
      } catch (error) {
        console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  // === Radio Buttons ===
  console.log("\n=== Radio Button Groups ===");
  const radioGroups = form.getRadioGroups();

  if (radioGroups.length === 0) {
    console.log("No radio button groups found in this form.");
  } else {
    for (const radioGroup of radioGroups) {
      console.log(`\nRadio Group: "${radioGroup.name}"`);

      // Show available options
      const options = radioGroup.getOptions();
      console.log(`  Options: ${options.join(", ")}`);

      // Show current selection
      const currentValue = radioGroup.getValue();
      console.log(`  Current selection: ${currentValue ?? "(none)"}`);

      // Skip if read-only
      if (radioGroup.isReadOnly()) {
        console.log(`  (Read-only, skipping)`);
        continue;
      }

      // Select a different option
      if (options.length > 0) {
        // Find an option that's not currently selected
        const newOption = options.find(opt => opt !== currentValue) ?? options[0];

        try {
          radioGroup.setValue(newOption ?? null);
          console.log(`  -> Selected: ${newOption}`);
        } catch (error) {
          console.log(`  Error: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
  }

  // Save the modified form
  console.log("\n=== Saving Modified Form ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("03-forms/filled-checkboxes-radios.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // Verify changes
  console.log("\n=== Verification ===");
  const verifyPdf = await PDF.load(savedBytes);
  const verifyForm = verifyPdf.getForm();

  if (verifyForm) {
    console.log("\nCheckbox states:");
    for (const cb of verifyForm.getCheckboxes()) {
      console.log(`  "${cb.name}": ${cb.isChecked() ? "checked" : "unchecked"}`);
    }

    console.log("\nRadio selections:");
    for (const rg of verifyForm.getRadioGroups()) {
      console.log(`  "${rg.name}": ${rg.getValue() ?? "(none)"}`);
    }
  }
}

main().catch(console.error);
