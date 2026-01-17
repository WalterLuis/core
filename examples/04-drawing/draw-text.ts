/**
 * Example: Draw Text
 *
 * This example demonstrates how to draw text on a page with various options
 * including position, font size, color, rotation, and alignment.
 *
 * Run: npx tsx examples/04-drawing/draw-text.ts
 */

import { black, blue, degrees, PDF, red, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Drawing text on a PDF page...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Get page dimensions for reference
  const { width, height } = page;
  console.log(`Page size: ${width} x ${height} points`);

  // === Basic Text ===
  console.log("\nDrawing basic text...");

  page.drawText("Hello, PDF!", {
    x: 50,
    y: height - 50,
    size: 24,
    color: black,
  });

  // === Different Sizes ===
  console.log("Drawing text at different sizes...");

  const sizes = [8, 10, 12, 14, 18, 24, 36];
  let yPos = height - 100;

  for (const size of sizes) {
    page.drawText(`This is ${size}pt text`, {
      x: 50,
      y: yPos,
      size,
      color: black,
    });
    yPos -= size + 10;
  }

  // === Different Colors ===
  console.log("Drawing colored text...");

  yPos -= 20;

  page.drawText("Red text", {
    x: 50,
    y: yPos,
    size: 18,
    color: red,
  });

  page.drawText("Blue text", {
    x: 150,
    y: yPos,
    size: 18,
    color: blue,
  });

  page.drawText("Custom RGB", {
    x: 260,
    y: yPos,
    size: 18,
    color: rgb(0.6, 0.2, 0.8), // Purple
  });

  // === Rotated Text ===
  console.log("Drawing rotated text...");

  yPos -= 80;

  page.drawText("Rotated 15 degrees", {
    x: 50,
    y: yPos,
    size: 14,
    color: black,
    rotate: degrees(15),
  });

  page.drawText("Rotated -15 degrees", {
    x: 250,
    y: yPos,
    size: 14,
    color: black,
    rotate: degrees(-15),
  });

  // Vertical text (90 degrees)
  page.drawText("Vertical", {
    x: width - 50,
    y: yPos + 50,
    size: 14,
    color: black,
    rotate: degrees(90),
  });

  // === Opacity ===
  console.log("Drawing text with opacity...");

  yPos -= 60;

  page.drawText("100% opacity", {
    x: 50,
    y: yPos,
    size: 16,
    color: black,
  });

  page.drawText("50% opacity", {
    x: 200,
    y: yPos,
    size: 16,
    color: black,
    opacity: 0.5,
  });

  page.drawText("25% opacity", {
    x: 350,
    y: yPos,
    size: 16,
    color: black,
    opacity: 0.25,
  });

  // === Text with Line Height ===
  console.log("Drawing multiline text...");

  yPos -= 80;

  page.drawText("This is line one.\nThis is line two.\nThis is line three.", {
    x: 50,
    y: yPos,
    size: 12,
    color: black,
    lineHeight: 18, // 1.5x line spacing
  });

  // === Text with Max Width (word wrap) ===
  console.log("Drawing wrapped text...");

  yPos -= 100;

  const longText =
    "This is a long paragraph of text that will be wrapped to fit within the specified maximum width. The library automatically handles word breaks and line wrapping for you.";

  page.drawText(longText, {
    x: 50,
    y: yPos,
    size: 11,
    color: black,
    maxWidth: 250,
    lineHeight: 16,
  });

  // === Positioned at specific coordinates ===
  console.log("Drawing positioned text...");

  // Draw some reference markers
  page.drawText("Bottom-left", {
    x: 10,
    y: 10,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText("Bottom-right", {
    x: width - 80,
    y: 10,
    size: 10,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("04-drawing/text-examples.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);
}

main().catch(console.error);
