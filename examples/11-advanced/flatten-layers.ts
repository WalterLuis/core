/**
 * Example: Flatten PDF Layers (OCG)
 *
 * This example demonstrates working with Optional Content Groups (layers)
 * and flattening them for security or compatibility.
 *
 * Run: npx tsx examples/11-advanced/flatten-layers.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Working with PDF layers (Optional Content Groups)...\n");

  console.log("=== What Are PDF Layers? ===\n");

  console.log("Optional Content Groups (OCG) allow:");
  console.log("- Content that can be toggled visible/invisible");
  console.log("- Common in CAD drawings, maps, technical documents");
  console.log("- Can be used for language variants, print vs screen");
  console.log("- Controlled via the Layers panel in PDF viewers\n");

  // Create a simple PDF (without layers)
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });
  const page = pdf.getPage(0);
  if (page) {
    page.drawText("Layer Flattening Example", {
      x: 150,
      y: page.height - 100,
      size: 28,
      color: black,
    });
    page.drawText("This document demonstrates layer operations.", {
      x: 100,
      y: page.height - 150,
      size: 14,
      color: black,
    });
  }

  const bytes = await pdf.save();
  const loaded = await PDF.load(bytes);

  console.log("=== Checking for Layers ===\n");

  const hasLayers = loaded.hasLayers();
  console.log(`Document has layers: ${hasLayers}`);

  if (hasLayers) {
    const layers = loaded.getLayers();
    console.log(`Number of layers: ${layers.length}`);
    console.log("\nLayer details:");
    for (const layer of layers) {
      console.log(`  ${layer.name}:`);
      console.log(`    Visible: ${layer.visible}`);
      console.log(`    Locked: ${layer.locked}`);
      console.log(`    Intent: ${layer.intent}`);
    }
  } else {
    console.log("This document has no layers.\n");
  }

  console.log("=== Why Flatten Layers? ===\n");

  console.log("1. Security before signing:");
  console.log("   - Prevents 'hidden content' attacks");
  console.log("   - Malicious content could be in OFF layers");
  console.log("   - Attacker turns layer ON after signing");
  console.log();
  console.log("2. Compatibility:");
  console.log("   - Some viewers don't support layers");
  console.log("   - Ensures consistent appearance");
  console.log();
  console.log("3. File size:");
  console.log("   - Removes OCG metadata overhead");
  console.log("   - (Does not remove actual content)");

  console.log("\n=== Flattening Layers ===\n");

  if (hasLayers) {
    // Flatten the layers
    const result = loaded.flattenLayers();
    console.log(`Flattened ${result.layerCount} layers`);
    console.log(`Flattened: ${result.flattened}`);

    // Verify layers are gone
    const afterHasLayers = loaded.hasLayers();
    console.log(`Has layers after flattening: ${afterHasLayers}`);

    // Save the flattened document
    const flattenedBytes = await loaded.save();
    const outputPath = await saveOutput("11-advanced/flattened-layers.pdf", flattenedBytes);
    console.log(`\nSaved: ${outputPath}`);
    console.log(`Size: ${formatBytes(flattenedBytes.length)}`);
  } else {
    console.log("No layers to flatten in this document.");
    console.log("Demonstrating the API anyway...\n");

    // Even without layers, flattenLayers is safe to call
    const result = loaded.flattenLayers();
    console.log(`flattenLayers() returned:`);
    console.log(`  layerCount: ${result.layerCount}`);
    console.log(`  flattened: ${result.flattened}`);
  }

  console.log("\n=== Security Workflow Example ===\n");

  console.log("// Before signing, flatten any layers");
  console.log("if (await pdf.hasLayers()) {");
  console.log("  const result = await pdf.flattenLayers();");
  // biome-ignore lint/suspicious/noTemplateCurlyInString: example code
  console.log("  console.log(`Flattened ${result.layerCount} layers`);");
  console.log("}");
  console.log();
  console.log("// Now safe to sign");
  console.log("const signResult = await pdf.sign({");
  console.log("  signer: mySigner,");
  console.log("  reason: 'Document approval',");
  console.log("});");

  console.log("\n=== Important Notes ===\n");

  console.log("1. Flattening makes ALL content visible");
  console.log("   - Content in OFF layers becomes visible");
  console.log("   - No content is deleted");
  console.log();
  console.log("2. The layer UI is removed");
  console.log("   - Viewers won't show the Layers panel");
  console.log("   - Users can't toggle layer visibility");
  console.log();
  console.log("3. Content streams are NOT modified");
  console.log("   - BDC/EMC markers remain but are ignored");
  console.log("   - Only OCProperties dictionary is removed");
}

main().catch(console.error);
