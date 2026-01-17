/**
 * Example: Embed OpenType Font
 *
 * This example demonstrates how to embed an OpenType font with CFF outlines
 * (.otf file) and use it for text drawing.
 *
 * Run: npx tsx examples/05-images-and-fonts/embed-opentype-font.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Embedding OpenType fonts...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Title
  page.drawText("OpenType Font Embedding", {
    x: 175,
    y: page.height - 40,
    size: 20,
    color: black,
  });

  // Load an OpenType font (CFF outlines)
  console.log("Loading OpenType font...");
  const fontBytes = await loadFixture("fonts", "otf/FoglihtenNo07.otf");
  console.log(`Font file size: ${formatBytes(fontBytes.length)}`);

  // Embed the font
  const otfFont = pdf.embedFont(fontBytes);
  console.log(`Embedded font: ${otfFont.baseFontName}`);

  // Draw text using the OpenType font
  page.drawText("OpenType Font Demo:", {
    x: 50,
    y: page.height - 80,
    size: 14,
    color: black,
  });

  page.drawText("This is an OpenType font with CFF outlines.", {
    x: 50,
    y: page.height - 120,
    size: 18,
    color: black,
    font: otfFont,
  });

  // The OpenType format supports:
  page.drawText("OpenType (.otf) features:", {
    x: 50,
    y: page.height - 180,
    size: 12,
    color: black,
  });

  const features = [
    "CFF (Compact Font Format) outlines",
    "PostScript-style curves",
    "Smaller file sizes for complex fonts",
    "Full Unicode support",
    "Advanced typographic features",
  ];

  let yPos = page.height - 210;
  for (const feature of features) {
    page.drawText(`- ${feature}`, {
      x: 70,
      y: yPos,
      size: 11,
      color: rgb(0.3, 0.3, 0.3),
    });
    yPos -= 20;
  }

  // Show different sizes
  page.drawText("Various sizes:", { x: 50, y: yPos - 20, size: 12, color: black });

  yPos -= 50;
  const sizes = [12, 18, 24, 36, 48];

  for (const size of sizes) {
    page.drawText(`Size ${size}`, {
      x: 50,
      y: yPos,
      size,
      color: black,
      font: otfFont,
    });
    yPos -= size + 15;
  }

  // Compare with TrueType
  page.drawText("Comparing OpenType vs TrueType:", {
    x: 50,
    y: yPos - 20,
    size: 12,
    color: black,
  });

  // Load a TrueType font for comparison
  let ttfFont = otfFont;
  try {
    const ttfBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    ttfFont = pdf.embedFont(ttfBytes);
    console.log(`Also embedded TTF: ${ttfFont.baseFontName}`);
  } catch {
    console.log("TTF font not found");
  }

  yPos -= 60;

  page.drawText("OpenType (CFF):", { x: 50, y: yPos, size: 10, color: black });
  page.drawText("The quick brown fox", {
    x: 150,
    y: yPos,
    size: 16,
    color: rgb(0.2, 0.3, 0.6),
    font: otfFont,
  });

  yPos -= 30;

  page.drawText("TrueType:", { x: 50, y: yPos, size: 10, color: black });
  page.drawText("The quick brown fox", {
    x: 150,
    y: yPos,
    size: 16,
    color: rgb(0.2, 0.3, 0.6),
    font: ttfFont,
  });

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("05-images-and-fonts/opentype-fonts.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  console.log("\n=== Notes ===");
  console.log("OpenType (.otf) fonts:");
  console.log("  - Use CFF (Compact Font Format) outlines");
  console.log("  - PostScript-style cubic Bezier curves");
  console.log("  - Often smaller file sizes than TrueType");
  console.log("  - Fully supported in @libpdf/core");
  console.log("  - Both .otf and .ttf use the same embedFont() API");
}

main().catch(console.error);
