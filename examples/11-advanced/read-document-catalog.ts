/**
 * Example: Read Document Catalog
 *
 * This example demonstrates traversing the PDF document structure
 * through the catalog and page tree.
 *
 * Run: npx tsx examples/11-advanced/read-document-catalog.ts
 */

import { black, PDF, PdfDict, PdfName, PdfNumber, PdfRef, PdfString } from "../../src/index";

function main() {
  console.log("Reading document catalog and page tree...\n");

  // Create a multi-page PDF for exploration
  const pdf = PDF.create();
  for (let i = 1; i <= 3; i++) {
    pdf.addPage({ size: i === 1 ? "letter" : "a4" });
    const page = pdf.getPage(i - 1);
    if (page) {
      page.drawText(`Page ${i}`, {
        x: 250,
        y: page.height - 100,
        size: 36,
        color: black,
      });
    }
  }

  // Set some metadata
  pdf.setTitle("Catalog Exploration");
  pdf.setAuthor("@libpdf/core");
  pdf.setLanguage("en-US");

  console.log("=== Document Trailer ===\n");

  const trailer = pdf.context.info.trailer;
  console.log("Trailer entries:");
  for (const key of trailer.keys()) {
    const value = trailer.get(key);
    if (value instanceof PdfRef) {
      console.log(`  /${key.value}: ${value.objectNumber} ${value.generation} R`);
    } else {
      console.log(`  /${key.value}: ${value?.constructor.name}`);
    }
  }

  console.log("\n=== Document Catalog ===\n");

  const catalog = pdf.getCatalog();
  if (catalog) {
    console.log("Catalog entries:");
    for (const key of catalog.keys()) {
      const value = catalog.get(key);
      if (value instanceof PdfRef) {
        console.log(`  /${key.value}: ${value.objectNumber} ${value.generation} R`);
      } else if (value instanceof PdfName) {
        console.log(`  /${key.value}: /${value.value}`);
      } else if (value instanceof PdfDict) {
        console.log(`  /${key.value}: << dictionary >>`);
      } else {
        console.log(`  /${key.value}: ${value?.constructor.name}`);
      }
    }

    // Read specific catalog entries
    console.log("\nCatalog details:");
    console.log(`  Type: ${catalog.getName("Type")?.value}`);

    const lang = catalog.getString("Lang");
    if (lang) {
      console.log(`  Language: ${lang.asString()}`);
    }
  }

  console.log("\n=== Page Tree Structure ===\n");

  // Access pages through the catalog
  const pagesRef = catalog?.getRef("Pages");
  if (pagesRef) {
    const pagesDict = pdf.getObject(pagesRef);
    if (pagesDict instanceof PdfDict) {
      console.log("Pages node:");
      console.log(`  Type: ${pagesDict.getName("Type")?.value}`);
      console.log(`  Count: ${pagesDict.getNumber("Count")?.value}`);

      const kids = pagesDict.getArray("Kids");
      if (kids) {
        console.log(`  Kids: ${kids.length} entries`);

        // Traverse each page
        console.log("\nPage tree traversal:");
        for (let i = 0; i < kids.length; i++) {
          const pageRef = kids.at(i);
          if (pageRef instanceof PdfRef) {
            const pageDict = pdf.getObject(pageRef);
            if (pageDict instanceof PdfDict) {
              console.log(`\n  Page ${i + 1} (${pageRef.objectNumber} ${pageRef.generation} R):`);
              console.log(`    Type: ${pageDict.getName("Type")?.value}`);

              // Read MediaBox
              const mediaBox = pageDict.getArray("MediaBox");
              if (mediaBox) {
                const values: number[] = [];
                for (let j = 0; j < mediaBox.length; j++) {
                  const item = mediaBox.at(j);
                  if (item instanceof PdfNumber) {
                    values.push(item.value);
                  }
                }
                const [x1, y1, x2, y2] = values;
                console.log(`    MediaBox: [${values.join(", ")}]`);
                if (x1 !== undefined && y1 !== undefined && x2 !== undefined && y2 !== undefined) {
                  console.log(`    Dimensions: ${x2 - x1} x ${y2 - y1} points`);
                }
              }

              // Check for rotation
              const rotate = pageDict.getNumber("Rotate");
              if (rotate) {
                console.log(`    Rotate: ${rotate.value} degrees`);
              }

              // Check for resources
              const resources = pageDict.get("Resources");
              if (resources) {
                console.log(`    Resources: ${resources.constructor.name}`);
              }
            }
          }
        }
      }
    }
  }

  console.log("\n=== Document Info Dictionary ===\n");

  const infoRef = trailer.getRef("Info");
  if (infoRef) {
    const info = pdf.getObject(infoRef);
    if (info instanceof PdfDict) {
      console.log("Info dictionary:");
      for (const key of info.keys()) {
        const value = info.get(key);
        if (value instanceof PdfString) {
          console.log(`  /${key.value}: "${value.asString()}"`);
        } else if (value instanceof PdfName) {
          console.log(`  /${key.value}: /${value.value}`);
        }
      }
    }
  } else {
    console.log("No Info dictionary present");
  }

  console.log("\n=== High-Level vs Low-Level Access ===\n");

  console.log("High-level API (recommended for most uses):");
  console.log(`  pdf.getTitle(): "${pdf.getTitle()}"`);
  console.log(`  pdf.getAuthor(): "${pdf.getAuthor()}"`);
  console.log(`  pdf.getPageCount(): ${pdf.getPageCount()}`);

  const page0 = pdf.getPage(0);
  if (page0) {
    console.log(`  page.width: ${page0.width}`);
    console.log(`  page.height: ${page0.height}`);
  }

  console.log("\nLow-level access is useful for:");
  console.log("  - Reading non-standard PDF structures");
  console.log("  - Debugging PDF issues");
  console.log("  - Implementing features not in the high-level API");
  console.log("  - Understanding PDF internals");
}

main();
