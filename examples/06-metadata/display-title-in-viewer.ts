/**
 * Example: Display Title in Viewer
 *
 * This example demonstrates setting a document title with the showInWindowTitleBar
 * option so PDF viewers display the title instead of the filename in the window.
 *
 * Run: npx tsx examples/06-metadata/display-title-in-viewer.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Setting title to display in viewer window...\n");

  // === Document WITHOUT display title option ===
  console.log("=== Creating document without display title option ===\n");

  const pdf1 = PDF.create();
  pdf1.addPage({ size: "letter" });

  const page1 = pdf1.getPage(0);
  if (page1) {
    page1.drawText("Document Without Display Title", {
      x: 140,
      y: page1.height - 50,
      size: 20,
      color: black,
    });

    page1.drawText("This document has a title set, but the viewer will show", {
      x: 50,
      y: page1.height - 120,
      size: 12,
      color: black,
    });

    page1.drawText("the filename in the window title bar instead.", {
      x: 50,
      y: page1.height - 140,
      size: 12,
      color: black,
    });
  }

  // Set title without the display option
  pdf1.setTitle("My Important Document");
  console.log(`Set title: ${pdf1.getTitle()}`);
  console.log("Display in title bar: No (default)");

  const bytes1 = await pdf1.save();
  const path1 = await saveOutput("06-metadata/title-not-displayed.pdf", bytes1);
  console.log(`Saved: ${path1}`);

  // === Document WITH display title option ===
  console.log("\n=== Creating document with display title option ===\n");

  const pdf2 = PDF.create();
  pdf2.addPage({ size: "letter" });

  const page2 = pdf2.getPage(0);
  if (page2) {
    page2.drawText("Document With Display Title", {
      x: 150,
      y: page2.height - 50,
      size: 20,
      color: black,
    });

    page2.drawText("This document will show the title in the viewer's window", {
      x: 50,
      y: page2.height - 120,
      size: 12,
      color: black,
    });

    page2.drawText("title bar instead of the filename.", {
      x: 50,
      y: page2.height - 140,
      size: 12,
      color: black,
    });

    page2.drawText('The title is: "Quarterly Financial Report Q4 2024"', {
      x: 50,
      y: page2.height - 180,
      size: 12,
      color: rgb(0.3, 0.3, 0.6),
    });
  }

  // Set title WITH the showInWindowTitleBar option
  pdf2.setTitle("Quarterly Financial Report Q4 2024", { showInWindowTitleBar: true });
  console.log(`Set title: ${pdf2.getTitle()}`);
  console.log("Display in title bar: Yes");

  const bytes2 = await pdf2.save();
  const path2 = await saveOutput("06-metadata/title-displayed.pdf", bytes2);
  console.log(`Saved: ${path2}`);

  // === How it works ===
  console.log("\n=== How It Works ===");
  console.log("\nThe showInWindowTitleBar option sets ViewerPreferences.DisplayDocTitle = true");
  console.log("in the PDF document catalog.");
  console.log("\nWhen this is set:");
  console.log("  - PDF viewers will show the document title in the window title bar");
  console.log("  - Instead of showing the filename (e.g., 'document.pdf')");
  console.log("  - This provides a better user experience for titled documents");
  console.log("\nSupported viewers:");
  console.log("  - Adobe Acrobat Reader");
  console.log("  - macOS Preview");
  console.log("  - Most modern PDF viewers");

  // === Comparison ===
  console.log("\n=== Comparison ===");
  console.log("\nOpen both PDFs and compare the window title bars:");
  console.log(`  1. ${path1}`);
  console.log("     Window title: 'title-not-displayed.pdf' (filename)");
  console.log(`  2. ${path2}`);
  console.log("     Window title: 'Quarterly Financial Report Q4 2024' (document title)");

  // Save sizes
  console.log("\n=== File Sizes ===");
  console.log(`Without display option: ${formatBytes(bytes1.length)}`);
  console.log(`With display option: ${formatBytes(bytes2.length)}`);
}

main().catch(console.error);
