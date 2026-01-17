/**
 * Example: Add Page Numbers
 *
 * This example demonstrates how to iterate through all pages of a PDF
 * and add page numbers at the bottom of each page.
 *
 * Run: npx tsx examples/04-drawing/add-page-numbers.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Adding page numbers to a PDF...\n");

  // Create a document with several pages
  const pdf = PDF.create();

  // Add 10 pages with some content
  for (let i = 1; i <= 10; i++) {
    pdf.addPage({ size: "letter" });
    const page = pdf.getPage(i - 1);
    if (!page) {
      continue;
    }

    // Add title
    page.drawText(`Chapter ${i}`, {
      x: 72,
      y: page.height - 72,
      size: 24,
      color: black,
    });

    // Add placeholder content
    page.drawText(`This is the content of chapter ${i}.`, {
      x: 72,
      y: page.height - 120,
      size: 12,
      color: black,
    });

    page.drawText("Lorem ipsum dolor sit amet, consectetur adipiscing elit.", {
      x: 72,
      y: page.height - 150,
      size: 11,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: 468,
    });
  }

  const totalPages = pdf.getPageCount();
  console.log(`Document has ${totalPages} pages`);

  // === Style 1: Simple page numbers (centered at bottom) ===
  console.log("\nAdding page numbers...");

  const pages = pdf.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) {
      continue;
    }

    const pageNumber = i + 1;
    const { width } = page;

    // Simple centered page number
    const text = `${pageNumber}`;
    const textWidth = text.length * 6; // Approximate width

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: 30,
      size: 10,
      color: black,
    });

    console.log(`  Page ${pageNumber}: Added page number`);
  }

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("04-drawing/page-numbers-simple.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // === Style 2: Page X of Y format ===
  console.log("\n=== Creating 'Page X of Y' version ===");

  const pdf2 = PDF.create();

  for (let i = 1; i <= 5; i++) {
    pdf2.addPage({ size: "letter" });
    const page = pdf2.getPage(i - 1);
    if (page) {
      page.drawText(`Section ${i}`, {
        x: 72,
        y: page.height - 72,
        size: 20,
        color: black,
      });
    }
  }

  const totalPages2 = pdf2.getPageCount();
  const pages2 = pdf2.getPages();

  for (let i = 0; i < pages2.length; i++) {
    const page = pages2[i];
    if (!page) {
      continue;
    }

    const pageNumber = i + 1;
    const { width } = page;

    // "Page X of Y" format
    const text = `Page ${pageNumber} of ${totalPages2}`;
    const textWidth = text.length * 5.5;

    page.drawText(text, {
      x: (width - textWidth) / 2,
      y: 30,
      size: 10,
      color: rgb(0.4, 0.4, 0.4),
    });
  }

  const savedBytes2 = await pdf2.save();
  const outputPath2 = await saveOutput("04-drawing/page-numbers-x-of-y.pdf", savedBytes2);

  console.log(`Output: ${outputPath2}`);
  console.log(`Size: ${formatBytes(savedBytes2.length)}`);

  // === Style 3: Right-aligned with document title ===
  console.log("\n=== Creating right-aligned version with header ===");

  const pdf3 = PDF.create();
  const documentTitle = "Annual Report 2024";

  for (let i = 1; i <= 5; i++) {
    pdf3.addPage({ size: "letter" });
    const page = pdf3.getPage(i - 1);
    if (page) {
      page.drawText(`Section ${i}`, {
        x: 72,
        y: page.height - 100,
        size: 18,
        color: black,
      });
    }
  }

  const pages3 = pdf3.getPages();
  const margin = 72;

  for (let i = 0; i < pages3.length; i++) {
    const page = pages3[i];
    if (!page) {
      continue;
    }

    const pageNumber = i + 1;
    const { width, height } = page;

    // Header: document title (left-aligned)
    page.drawText(documentTitle, {
      x: margin,
      y: height - 40,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Header: page number (right-aligned)
    const pageNumText = `${pageNumber}`;
    page.drawText(pageNumText, {
      x: width - margin - 20,
      y: height - 40,
      size: 9,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Header line
    page.drawLine({
      start: { x: margin, y: height - 50 },
      end: { x: width - margin, y: height - 50 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Footer line
    page.drawLine({
      start: { x: margin, y: 50 },
      end: { x: width - margin, y: 50 },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.7),
    });

    // Footer: copyright (left)
    page.drawText("© 2024 Example Corp", {
      x: margin,
      y: 35,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Footer: page number (right)
    page.drawText(`Page ${pageNumber}`, {
      x: width - margin - 40,
      y: 35,
      size: 8,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const savedBytes3 = await pdf3.save();
  const outputPath3 = await saveOutput("04-drawing/page-numbers-styled.pdf", savedBytes3);

  console.log(`Output: ${outputPath3}`);
  console.log(`Size: ${formatBytes(savedBytes3.length)}`);

  console.log("\n=== Summary ===");
  console.log("Created three versions:");
  console.log("  1. Simple centered page numbers");
  console.log("  2. 'Page X of Y' format");
  console.log("  3. Styled header/footer with document title");
}

main().catch(console.error);
