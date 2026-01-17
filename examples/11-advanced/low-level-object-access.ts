/**
 * Example: Low-Level Object Access
 *
 * This example demonstrates direct manipulation of PDF objects
 * using PdfDict, PdfArray, PdfName, etc.
 *
 * Run: npx tsx examples/11-advanced/low-level-object-access.ts
 */

import { black, PDF, PdfArray, PdfDict, PdfName, PdfNumber, PdfString } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Low-level PDF object manipulation...\n");

  // Create a PDF for experimentation
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  console.log("=== Basic Object Types ===\n");

  // PdfName - used for keys and type identifiers
  const name = PdfName.of("MyCustomName");
  console.log(`PdfName: ${name.value}`);

  // PdfNumber - integers and floats
  const integer = PdfNumber.of(42);
  // biome-ignore lint/suspicious/noApproximativeNumericConstant: example code
  const float = PdfNumber.of(3.14159);
  console.log(`PdfNumber (int): ${integer.value}`);
  console.log(`PdfNumber (float): ${float.value}`);

  // PdfString - text strings
  const str = PdfString.fromString("Hello, PDF!");
  console.log(`PdfString: ${str.asString()}`);

  // PdfArray - ordered collections
  const arr = new PdfArray([PdfNumber.of(1), PdfNumber.of(2), PdfNumber.of(3)]);
  console.log(`PdfArray length: ${arr.length}`);

  // PdfDict - key-value dictionaries
  const _dict = new PdfDict([
    ["Type", PdfName.of("CustomObject")],
    ["Value", PdfNumber.of(100)],
    ["Description", PdfString.fromString("A custom object")],
  ]);
  console.log(`PdfDict keys: Type, Value, Description`);

  console.log("\n=== Accessing the Document Catalog ===\n");

  const catalog = pdf.getCatalog();
  if (catalog) {
    console.log("Catalog entries:");

    // Iterate over catalog entries using keys() and get()
    for (const key of catalog.keys()) {
      const value = catalog.get(key);
      const valueType = value?.constructor.name;
      console.log(`  /${key.value}: ${valueType}`);
    }

    // Get specific values
    const type = catalog.getName("Type");
    console.log(`\nCatalog Type: ${type?.value}`);

    const pagesRef = catalog.getRef("Pages");
    console.log(`Pages reference: ${pagesRef?.objectNumber} ${pagesRef?.generation} R`);
  }

  console.log("\n=== Modifying the Info Dictionary ===\n");

  // Access through the PDF API
  pdf.setTitle("Low-Level Example");
  pdf.setAuthor("@libpdf/core");

  // Add custom metadata through low-level access
  const trailer = pdf.context.info.trailer;
  const infoRef = trailer.getRef("Info");

  if (infoRef) {
    const info = pdf.getObject(infoRef);
    if (info instanceof PdfDict) {
      // Add a custom key (not standard PDF metadata)
      info.set("CustomKey", PdfString.fromString("Custom Value"));
      console.log("Added custom key to Info dictionary");

      // Read back values using keys() and get()
      console.log("\nInfo dictionary contents:");
      for (const key of info.keys()) {
        const value = info.get(key);
        if (value instanceof PdfString) {
          console.log(`  /${key.value}: "${value.asString()}"`);
        } else if (value instanceof PdfName) {
          console.log(`  /${key.value}: /${value.value}`);
        } else {
          console.log(`  /${key.value}: ${value?.constructor.name}`);
        }
      }
    }
  }

  console.log("\n=== Creating Custom Objects ===\n");

  // Register a custom dictionary object
  const customDict = PdfDict.of({
    Type: PdfName.of("CustomResource"),
    Subtype: PdfName.of("Example"),
    Data: new PdfArray([PdfNumber.of(10), PdfNumber.of(20), PdfNumber.of(30)]),
    Metadata: PdfDict.of({
      Created: PdfString.fromString("2024-01-15"),
      Version: PdfNumber.of(1),
    }),
  });

  const customRef = pdf.register(customDict);
  console.log(`Registered custom object: ${customRef.objectNumber} ${customRef.generation} R`);

  // Verify we can retrieve it
  const retrieved = pdf.getObject(customRef);
  if (retrieved instanceof PdfDict) {
    console.log(`Retrieved Type: ${retrieved.getName("Type")?.value}`);
    console.log(`Retrieved Subtype: ${retrieved.getName("Subtype")?.value}`);
  }

  console.log("\n=== Working with Page Objects ===\n");

  const page = pdf.getPage(0);
  if (page) {
    // Add some content for context
    page.drawText("Low-Level Access Demo", {
      x: 180,
      y: page.height - 100,
      size: 24,
      color: black,
    });

    // Access the underlying page dictionary
    const pageDict = page.dict;
    console.log("Page dictionary entries:");
    for (const key of pageDict.keys()) {
      console.log(`  /${key.value}`);
    }

    // Read MediaBox
    const mediaBox = pageDict.getArray("MediaBox");
    if (mediaBox) {
      const values = [];
      for (let i = 0; i < mediaBox.length; i++) {
        const item = mediaBox.at(i);
        if (item instanceof PdfNumber) {
          values.push(item.value);
        }
      }
      console.log(`\nMediaBox: [${values.join(", ")}]`);
    }
  }

  // Save the document
  const bytes = await pdf.save();
  const outputPath = await saveOutput("11-advanced/low-level-access.pdf", bytes);

  console.log(`\nSaved: ${outputPath}`);
  console.log(`Size: ${formatBytes(bytes.length)}`);
}

main().catch(console.error);
