/**
 * Example: Add Watermark
 *
 * This example demonstrates how to embed a page from another PDF and
 * draw it as a semi-transparent watermark on all pages of a document.
 *
 * Run: npx tsx examples/04-drawing/add-watermark.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Adding watermarks to a PDF...\n");

  // Create a watermark PDF
  console.log("Creating watermark...");
  const watermarkPdf = PDF.create();
  watermarkPdf.addPage({ size: "letter" });

  const watermarkPage = watermarkPdf.getPage(0);
  if (!watermarkPage) {
    throw new Error("Failed to get watermark page");
  }

  // Draw a diagonal "DRAFT" watermark
  watermarkPage.drawText("DRAFT", {
    x: 150,
    y: 350,
    size: 100,
    color: rgb(0.8, 0.1, 0.1), // Red
    rotate: { angle: 45 },
    opacity: 0.3,
  });

  // Create the main document
  console.log("Creating main document...");
  const mainPdf = PDF.create();

  // Add several pages with content
  for (let i = 1; i <= 5; i++) {
    mainPdf.addPage({ size: "letter" });
    const page = mainPdf.getPage(i - 1);
    if (!page) {
      continue;
    }

    page.drawText(`Document Page ${i}`, {
      x: 200,
      y: page.height - 50,
      size: 24,
      color: black,
    });

    page.drawText(
      `This is sample content for page ${i}. The watermark should ` +
        `appear behind this text across all pages.`,
      {
        x: 50,
        y: page.height - 100,
        size: 12,
        color: black,
        maxWidth: 500,
      },
    );

    // Add some placeholder content
    for (let j = 0; j < 10; j++) {
      page.drawText(`Line ${j + 1} of content on page ${i}`, {
        x: 50,
        y: page.height - 150 - j * 30,
        size: 11,
        color: black,
      });
    }
  }

  console.log(`Main document: ${mainPdf.getPageCount()} pages`);

  // Embed the watermark page
  console.log("\nEmbedding watermark page...");
  const embeddedWatermark = await mainPdf.embedPage(watermarkPdf, 0);

  console.log(`Embedded page dimensions: ${embeddedWatermark.width} x ${embeddedWatermark.height}`);

  // Apply watermark to all pages
  console.log("Applying watermark to all pages...");
  const pages = mainPdf.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    if (!page) {
      continue;
    }

    // Draw the watermark centered on the page
    // The watermark is drawn at low opacity and positioned
    page.drawPage(embeddedWatermark, {
      x: 0,
      y: 0,
      opacity: 0.15, // Very transparent
    });

    console.log(`  Applied to page ${i + 1}`);
  }

  // Save the watermarked document
  console.log("\n=== Saving Watermarked Document ===");
  const savedBytes = await mainPdf.save();
  const outputPath = await saveOutput("04-drawing/watermarked-document.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  // === Alternative: Text-only watermark ===
  console.log("\n=== Creating text-only watermark version ===");

  const textWatermarkPdf = PDF.create();

  for (let i = 1; i <= 3; i++) {
    textWatermarkPdf.addPage({ size: "letter" });
    const page = textWatermarkPdf.getPage(i - 1);
    if (!page) {
      continue;
    }

    // Add document content first
    page.drawText(`Confidential Document - Page ${i}`, {
      x: 150,
      y: page.height - 50,
      size: 20,
      color: black,
    });

    page.drawText("This document contains sensitive information.", {
      x: 50,
      y: page.height - 100,
      size: 12,
      color: black,
    });

    // Add text watermark directly (simpler approach)
    page.drawText("CONFIDENTIAL", {
      x: 80,
      y: page.height / 2,
      size: 72,
      color: rgb(0.5, 0.5, 0.5),
      rotate: { angle: 45 },
      opacity: 0.2,
    });
  }

  const textWatermarkBytes = await textWatermarkPdf.save();
  const textOutputPath = await saveOutput(
    "04-drawing/text-watermarked-document.pdf",
    textWatermarkBytes,
  );

  console.log(`Output: ${textOutputPath}`);
  console.log(`Size: ${formatBytes(textWatermarkBytes.length)}`);
}

main().catch(console.error);
