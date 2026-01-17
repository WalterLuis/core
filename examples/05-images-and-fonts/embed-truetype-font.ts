/**
 * Example: Embed TrueType Font
 *
 * This example demonstrates how to embed a custom TrueType font (.ttf)
 * into a PDF and use it for drawing text.
 *
 * Run: npx tsx examples/05-images-and-fonts/embed-truetype-font.ts
 */

import { black, blue, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Embedding TrueType fonts...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Title using default font
  page.drawText("TrueType Font Embedding", {
    x: 170,
    y: page.height - 40,
    size: 20,
    color: black,
  });

  // Load a TrueType font
  console.log("Loading TrueType font...");
  const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
  console.log(`Font file size: ${formatBytes(fontBytes.length)}`);

  // Embed the font
  const liberationSans = pdf.embedFont(fontBytes);
  console.log(`Embedded font: ${liberationSans.baseFontName}`);

  // Draw text using the embedded font
  page.drawText("Liberation Sans Regular", {
    x: 50,
    y: page.height - 80,
    size: 12,
    color: black,
  });

  page.drawText("This text uses the embedded Liberation Sans font.", {
    x: 50,
    y: page.height - 110,
    size: 14,
    color: black,
    font: liberationSans,
  });

  page.drawText("The quick brown fox jumps over the lazy dog.", {
    x: 50,
    y: page.height - 140,
    size: 14,
    color: black,
    font: liberationSans,
  });

  // Different sizes with the custom font
  page.drawText("Different sizes:", { x: 50, y: page.height - 180, size: 12, color: black });

  const sizes = [10, 14, 18, 24, 30];
  let yPos = page.height - 210;

  for (const size of sizes) {
    page.drawText(`Size ${size}pt: Hello World!`, {
      x: 50,
      y: yPos,
      size,
      color: black,
      font: liberationSans,
    });
    yPos -= size + 15;
  }

  // Load and embed a different font style
  console.log("\nLoading italic font...");
  let italicFont = liberationSans;
  try {
    const italicBytes = await loadFixture("fonts", "ttf/JosefinSans-Italic.ttf");
    italicFont = pdf.embedFont(italicBytes);
    console.log(`Embedded italic font: ${italicFont.baseFontName}`);
  } catch {
    console.log("Italic font not found, using regular");
  }

  page.drawText("Multiple fonts on same page:", {
    x: 50,
    y: yPos - 30,
    size: 12,
    color: black,
  });

  yPos -= 60;

  page.drawText("Regular Liberation Sans", {
    x: 50,
    y: yPos,
    size: 16,
    color: black,
    font: liberationSans,
  });

  page.drawText("Italic Josefin Sans", {
    x: 50,
    y: yPos - 25,
    size: 16,
    color: blue,
    font: italicFont,
  });

  // Colored text with embedded font
  page.drawText("Colored text with custom fonts:", {
    x: 50,
    y: yPos - 70,
    size: 12,
    color: black,
  });

  const colors = [
    { name: "Red", color: rgb(0.8, 0.1, 0.1) },
    { name: "Green", color: rgb(0.1, 0.6, 0.1) },
    { name: "Blue", color: rgb(0.1, 0.1, 0.8) },
    { name: "Purple", color: rgb(0.5, 0.1, 0.5) },
    { name: "Orange", color: rgb(0.9, 0.5, 0.1) },
  ];

  yPos -= 100;

  for (const c of colors) {
    page.drawText(`${c.name} text in Liberation Sans`, {
      x: 50,
      y: yPos,
      size: 14,
      color: c.color,
      font: liberationSans,
    });
    yPos -= 25;
  }

  // Load a decorative font
  console.log("\nLoading decorative font...");
  let decorativeFont = liberationSans;
  try {
    const decorativeBytes = await loadFixture("fonts", "ttf/Pacifico-Regular.ttf");
    decorativeFont = pdf.embedFont(decorativeBytes);
    console.log(`Embedded decorative font: ${decorativeFont.baseFontName}`);
  } catch {
    console.log("Decorative font not found");
  }

  page.drawText("Decorative font:", { x: 50, y: yPos - 20, size: 12, color: black });

  page.drawText("Beautiful Typography!", {
    x: 50,
    y: yPos - 55,
    size: 24,
    color: rgb(0.4, 0.2, 0.6),
    font: decorativeFont,
  });

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("05-images-and-fonts/truetype-fonts.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  console.log("\n=== Notes ===");
  console.log("TrueType font embedding:");
  console.log("  - Fonts are embedded directly in the PDF");
  console.log("  - Recipients don't need the font installed");
  console.log("  - Font subsetting reduces file size (only used glyphs)");
  console.log("  - Most TrueType (.ttf) fonts are supported");
}

main().catch(console.error);
