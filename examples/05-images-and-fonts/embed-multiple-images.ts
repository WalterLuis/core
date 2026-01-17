/**
 * Example: Embed Multiple Images
 *
 * This example demonstrates how to create a photo gallery page by embedding
 * and arranging multiple images in a grid layout.
 *
 * Run: npx tsx examples/05-images-and-fonts/embed-multiple-images.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Creating a photo gallery...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter", orientation: "landscape" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Page dimensions (landscape)
  const { width, height } = page;
  const margin = 40;

  // Title
  page.drawText("Photo Gallery", {
    x: width / 2 - 60,
    y: height - 30,
    size: 20,
    color: black,
  });

  // Load multiple images
  console.log("Loading images...");

  const imageFiles = [
    { category: "images", file: "sample.jpg", label: "Sample" },
    { category: "images", file: "gradient.jpg", label: "Gradient" },
    { category: "images", file: "red-square.jpg", label: "Red Square" },
  ];

  const images: Array<{
    image: Awaited<ReturnType<typeof pdf.embedImage>>;
    label: string;
  }> = [];

  for (const imgFile of imageFiles) {
    try {
      const bytes = await loadFixture(imgFile.category, imgFile.file);
      const image = pdf.embedImage(bytes);
      images.push({ image, label: imgFile.label });
      console.log(`  Loaded: ${imgFile.file} (${image.width}x${image.height})`);
    } catch (_error) {
      console.log(`  Skipped: ${imgFile.file} (not found)`);
    }
  }

  // If we don't have enough images, duplicate what we have
  while (images.length < 6 && images.length > 0) {
    const orig = images[images.length % images.length];
    if (orig) {
      images.push({ image: orig.image, label: `${orig.label} (copy)` });
    }
  }

  if (images.length === 0) {
    console.log("No images found, creating placeholder gallery");

    // Create a placeholder document
    page.drawText("No images found in fixtures", {
      x: width / 2 - 100,
      y: height / 2,
      size: 16,
      color: rgb(0.5, 0.5, 0.5),
    });
  } else {
    // Calculate grid layout
    const cols = 3;
    const rows = 2;
    const gap = 20;

    const availableWidth = width - 2 * margin - (cols - 1) * gap;
    const availableHeight = height - 80 - 2 * margin - (rows - 1) * gap;

    const cellWidth = availableWidth / cols;
    const cellHeight = availableHeight / rows;

    console.log(
      `\nGrid layout: ${cols}x${rows}, cell size: ${cellWidth.toFixed(0)}x${cellHeight.toFixed(0)}`,
    );

    // Draw images in grid
    let imageIndex = 0;

    for (let row = 0; row < rows && imageIndex < images.length; row++) {
      for (let col = 0; col < cols && imageIndex < images.length; col++) {
        const entry = images[imageIndex];
        if (!entry) {
          continue;
        }

        const x = margin + col * (cellWidth + gap);
        const y = height - 60 - margin - (row + 1) * cellHeight - row * gap;

        // Draw cell background
        page.drawRectangle({
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          color: rgb(0.95, 0.95, 0.95),
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1,
        });

        // Calculate image size to fit in cell with padding
        const padding = 10;
        const maxImgWidth = cellWidth - 2 * padding;
        const maxImgHeight = cellHeight - 30 - padding; // Leave room for label

        const imgAspect = entry.image.width / entry.image.height;
        let imgWidth = maxImgWidth;
        let imgHeight = imgWidth / imgAspect;

        if (imgHeight > maxImgHeight) {
          imgHeight = maxImgHeight;
          imgWidth = imgHeight * imgAspect;
        }

        // Center image in cell
        const imgX = x + (cellWidth - imgWidth) / 2;
        const imgY = y + padding + 20 + (maxImgHeight - imgHeight) / 2;

        // Draw image
        page.drawImage(entry.image, {
          x: imgX,
          y: imgY,
          width: imgWidth,
          height: imgHeight,
        });

        // Draw label
        page.drawText(entry.label, {
          x: x + 10,
          y: y + 8,
          size: 10,
          color: black,
        });

        imageIndex++;
      }
    }

    console.log(`Placed ${imageIndex} images`);
  }

  // Add a second page with a different layout
  pdf.addPage({ size: "letter" });
  const page2 = pdf.getPage(1);

  if (page2 && images.length > 0) {
    page2.drawText("Alternative Layout - Filmstrip", {
      x: 150,
      y: page2.height - 40,
      size: 18,
      color: black,
    });

    // Filmstrip style - horizontal row with border
    const stripY = page2.height - 200;
    const stripHeight = 120;
    const imgPadding = 10;
    const filmWidth = page2.width - 80;

    // Filmstrip background
    page2.drawRectangle({
      x: 40,
      y: stripY,
      width: filmWidth,
      height: stripHeight,
      color: rgb(0.1, 0.1, 0.1),
    });

    // Draw sprocket holes
    for (let i = 0; i < 20; i++) {
      page2.drawRectangle({
        x: 50 + i * 30,
        y: stripY + 5,
        width: 10,
        height: 8,
        color: rgb(0.95, 0.95, 0.95),
        cornerRadius: 2,
      });
      page2.drawRectangle({
        x: 50 + i * 30,
        y: stripY + stripHeight - 13,
        width: 10,
        height: 8,
        color: rgb(0.95, 0.95, 0.95),
        cornerRadius: 2,
      });
    }

    // Draw images in filmstrip
    let stripX = 50;
    const imgHeight = stripHeight - 40;

    for (const entry of images.slice(0, 5)) {
      const imgAspect = entry.image.width / entry.image.height;
      const imgWidth = imgHeight * imgAspect;

      page2.drawImage(entry.image, {
        x: stripX,
        y: stripY + 20,
        width: imgWidth,
        height: imgHeight,
      });

      stripX += imgWidth + imgPadding;
      if (stripX > filmWidth) {
        break;
      }
    }
  }

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("05-images-and-fonts/photo-gallery.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);
}

main().catch(console.error);
