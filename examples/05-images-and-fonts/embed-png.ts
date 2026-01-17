/**
 * Example: Embed PNG Image
 *
 * This example demonstrates how to embed a PNG image (with transparency)
 * into a PDF and draw it on a page.
 *
 * Run: npx tsx examples/05-images-and-fonts/embed-png.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Embedding PNG images...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Title
  page.drawText("PNG Image Embedding with Transparency", {
    x: 120,
    y: page.height - 40,
    size: 18,
    color: black,
  });

  // Load a PNG with alpha channel
  console.log("Loading PNG with transparency...");
  const pngBytes = await loadFixture("images", "green-circle-alpha.png");
  console.log(`Loaded PNG: ${formatBytes(pngBytes.length)}`);

  // Embed the PNG
  const image = pdf.embedPng(pngBytes);
  console.log(`Image dimensions: ${image.width} x ${image.height} pixels`);

  // Draw a colored background to show transparency
  page.drawText("Transparency demo (colored backgrounds):", {
    x: 50,
    y: page.height - 80,
    size: 12,
    color: black,
  });

  // Red background
  page.drawRectangle({
    x: 50,
    y: page.height - 200,
    width: 120,
    height: 100,
    color: rgb(1.0, 0.8, 0.8), // Light red
  });

  page.drawImage(image, {
    x: 60,
    y: page.height - 190,
    width: 80,
    height: 80,
  });

  // Blue background
  page.drawRectangle({
    x: 200,
    y: page.height - 200,
    width: 120,
    height: 100,
    color: rgb(0.8, 0.8, 1.0), // Light blue
  });

  page.drawImage(image, {
    x: 210,
    y: page.height - 190,
    width: 80,
    height: 80,
  });

  // Yellow background
  page.drawRectangle({
    x: 350,
    y: page.height - 200,
    width: 120,
    height: 100,
    color: rgb(1.0, 1.0, 0.8), // Light yellow
  });

  page.drawImage(image, {
    x: 360,
    y: page.height - 190,
    width: 80,
    height: 80,
  });

  // === Different sizes ===
  page.drawText("Different sizes:", { x: 50, y: page.height - 240, size: 12, color: black });

  const sizes = [30, 50, 70, 90, 110];
  let xPos = 50;

  for (const size of sizes) {
    page.drawImage(image, {
      x: xPos,
      y: page.height - 370,
      width: size,
      height: size,
    });
    xPos += size + 20;
  }

  // === Overlapping images to show transparency blending ===
  page.drawText("Overlapping (transparency blending):", {
    x: 50,
    y: page.height - 400,
    size: 12,
    color: black,
  });

  // Load different PNG images if available, or use the same one
  let redPng: Awaited<ReturnType<typeof pdf.embedPng>>;
  let bluePng: Awaited<ReturnType<typeof pdf.embedPng>>;

  try {
    const redBytes = await loadFixture("images", "red-square.png");
    redPng = pdf.embedPng(redBytes);
  } catch {
    redPng = image;
  }

  try {
    const blueBytes = await loadFixture("images", "blue-rectangle.png");
    bluePng = pdf.embedPng(blueBytes);
  } catch {
    bluePng = image;
  }

  // Draw overlapping images
  page.drawImage(redPng, {
    x: 50,
    y: page.height - 550,
    width: 100,
    height: 100,
  });

  page.drawImage(bluePng, {
    x: 100,
    y: page.height - 520,
    width: 100,
    height: 100,
  });

  page.drawImage(image, {
    x: 80,
    y: page.height - 580,
    width: 80,
    height: 80,
  });

  // === Using embedImage (auto-detect format) ===
  page.drawText("Using embedImage() (auto-detect):", {
    x: 300,
    y: page.height - 400,
    size: 12,
    color: black,
  });

  // embedImage automatically detects JPEG vs PNG
  const autoImage = pdf.embedImage(pngBytes);
  page.drawImage(autoImage, {
    x: 300,
    y: page.height - 520,
    width: 100,
    height: 100,
  });

  page.drawText("(Same result)", { x: 320, y: page.height - 540, size: 10, color: black });

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("05-images-and-fonts/png-embedded.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  console.log("\n=== Notes ===");
  console.log("PNG images in PDF:");
  console.log("  - Alpha channel (transparency) is preserved");
  console.log("  - Transparent pixels show background content");
  console.log("  - File size may be larger than JPEG for photos");
  console.log("  - Best for graphics, logos, and images with sharp edges");
}

main().catch(console.error);
