/**
 * Example: Draw on Existing Page
 *
 * This example demonstrates how to load an existing PDF and add new content
 * (text, shapes) on top of the existing page content.
 *
 * Run: npx tsx examples/04-drawing/draw-on-existing-page.ts
 */

import { black, blue, PDF, red, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Drawing on an existing PDF page...\n");

  // Load an existing PDF
  const bytes = await loadFixture("basic", "rot0.pdf");
  const pdf = await PDF.load(bytes);

  console.log(`Loaded PDF with ${pdf.getPageCount()} page(s)`);

  // Get the first page
  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  console.log(`Page dimensions: ${page.width} x ${page.height}`);

  // === Add a header ===
  console.log("\nAdding header...");

  // Draw a colored banner at the top
  page.drawRectangle({
    x: 0,
    y: page.height - 40,
    width: page.width,
    height: 40,
    color: rgb(0.2, 0.3, 0.5), // Dark blue
  });

  // Draw header text
  page.drawText("MODIFIED DOCUMENT", {
    x: page.width / 2 - 80,
    y: page.height - 28,
    size: 14,
    color: rgb(1, 1, 1), // White
  });

  // === Add annotations/highlights ===
  console.log("Adding annotations...");

  // Highlight box (semi-transparent)
  page.drawRectangle({
    x: 50,
    y: 400,
    width: 200,
    height: 30,
    color: rgb(1, 1, 0), // Yellow
    opacity: 0.3,
  });

  // Add a note
  page.drawText("NOTE: This section is important!", {
    x: 55,
    y: 407,
    size: 10,
    color: red,
  });

  // === Add a stamp ===
  console.log("Adding stamp...");

  // Draw a circular stamp
  page.drawCircle({
    x: page.width - 100,
    y: 100,
    radius: 50,
    borderColor: red,
    borderWidth: 3,
  });

  page.drawText("APPROVED", {
    x: page.width - 140,
    y: 95,
    size: 14,
    color: red,
  });

  // Date under the stamp
  const today = new Date().toISOString().split("T")[0];
  page.drawText(today ?? "", {
    x: page.width - 130,
    y: 75,
    size: 10,
    color: red,
  });

  // === Add callout arrows ===
  console.log("Adding callouts...");

  // Draw an arrow pointing to something
  page.drawPath().moveTo(300, 500).lineTo(400, 550).stroke({ borderColor: blue, borderWidth: 2 });

  // Arrow head
  page.drawPath().moveTo(400, 550).lineTo(390, 545).lineTo(395, 555).close().fill({ color: blue });

  // Callout text
  page.drawText("See this section", {
    x: 260,
    y: 485,
    size: 10,
    color: blue,
  });

  // === Add a footer ===
  console.log("Adding footer...");

  // Footer line
  page.drawLine({
    start: { x: 50, y: 30 },
    end: { x: page.width - 50, y: 30 },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5),
  });

  // Footer text
  page.drawText("Modified with @libpdf/core", {
    x: 50,
    y: 15,
    size: 8,
    color: rgb(0.5, 0.5, 0.5),
  });

  page.drawText(`Modified: ${today}`, {
    x: page.width - 150,
    y: 15,
    size: 8,
    color: rgb(0.5, 0.5, 0.5),
  });

  // === Add signature line ===
  console.log("Adding signature line...");

  page.drawLine({
    start: { x: 350, y: 150 },
    end: { x: 550, y: 150 },
    thickness: 1,
    color: black,
  });

  page.drawText("Signature", {
    x: 430,
    y: 135,
    size: 10,
    color: black,
  });

  // Save the modified document
  console.log("\n=== Saving Modified Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("04-drawing/modified-existing.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Original size: ${formatBytes(bytes.length)}`);
  console.log(`Modified size: ${formatBytes(savedBytes.length)}`);

  console.log("\n=== Notes ===");
  console.log("When drawing on existing pages:");
  console.log("  - New content is drawn on top of existing content");
  console.log("  - You cannot modify or remove existing content");
  console.log("  - Use semi-transparent shapes to highlight without obscuring");
  console.log("  - Consider the existing layout to avoid overlapping text");
}

main().catch(console.error);
