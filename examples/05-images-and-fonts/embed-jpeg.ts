/**
 * Example: Embed JPEG Image
 *
 * This example demonstrates how to embed a JPEG image into a PDF and
 * draw it on a page at a specific position and size.
 *
 * Run: npx tsx examples/05-images-and-fonts/embed-jpeg.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Embedding a JPEG image...\n");

  // Load a JPEG image from fixtures
  const jpegBytes = await loadFixture("images", "sample.jpg");
  console.log(`Loaded JPEG: ${formatBytes(jpegBytes.length)}`);

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Title
  page.drawText("JPEG Image Embedding", {
    x: 180,
    y: page.height - 40,
    size: 20,
    color: black,
  });

  // Embed the JPEG image
  console.log("Embedding image...");
  const image = pdf.embedJpeg(jpegBytes);

  console.log(`Image dimensions: ${image.width} x ${image.height} pixels`);

  // === Draw at original size ===
  page.drawText("Original size:", { x: 50, y: page.height - 80, size: 12, color: black });

  page.drawImage(image, {
    x: 50,
    y: page.height - 300,
    width: image.width,
    height: image.height,
  });

  // === Draw scaled down ===
  page.drawText("Scaled to 50%:", { x: 50, y: page.height - 340, size: 12, color: black });

  page.drawImage(image, {
    x: 50,
    y: page.height - 450,
    width: image.width * 0.5,
    height: image.height * 0.5,
  });

  // === Draw with specific dimensions ===
  page.drawText("Fixed size (100x100):", { x: 300, y: page.height - 340, size: 12, color: black });

  page.drawImage(image, {
    x: 300,
    y: page.height - 450,
    width: 100,
    height: 100,
  });

  // === Draw with aspect ratio preserved (fit width) ===
  page.drawText("Fit to width (200px):", { x: 50, y: page.height - 500, size: 12, color: black });

  const targetWidth = 200;
  const aspectRatio = image.height / image.width;

  page.drawImage(image, {
    x: 50,
    y: page.height - 620,
    width: targetWidth,
    height: targetWidth * aspectRatio,
  });

  // === Draw with opacity ===
  page.drawText("50% opacity:", { x: 300, y: page.height - 500, size: 12, color: black });

  page.drawImage(image, {
    x: 300,
    y: page.height - 620,
    width: 150,
    height: 150 * aspectRatio,
    opacity: 0.5,
  });

  // Add page 2 with more examples
  pdf.addPage({ size: "letter" });
  const page2 = pdf.getPage(1);
  if (page2) {
    page2.drawText("Multiple Images on Page 2", {
      x: 180,
      y: page2.height - 40,
      size: 18,
      color: black,
    });

    // Draw a grid of the same image
    const thumbnailSize = 80;
    let y = page2.height - 100;

    for (let row = 0; row < 3; row++) {
      let x = 50;
      for (let col = 0; col < 5; col++) {
        page2.drawImage(image, {
          x,
          y: y - thumbnailSize,
          width: thumbnailSize,
          height: thumbnailSize * aspectRatio,
        });
        x += thumbnailSize + 20;
      }
      y -= thumbnailSize * aspectRatio + 30;
    }
  }

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("05-images-and-fonts/jpeg-embedded.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);
}

main().catch(console.error);
