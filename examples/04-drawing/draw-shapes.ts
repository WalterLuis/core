/**
 * Example: Draw Shapes
 *
 * This example demonstrates how to draw geometric shapes including
 * rectangles, lines, circles, and ellipses with various styling options.
 *
 * Run: npx tsx examples/04-drawing/draw-shapes.ts
 */

import { black, blue, green, PDF, red, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Drawing shapes on a PDF page...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  const { height } = page;

  // Title
  page.drawText("Shape Drawing Examples", {
    x: 180,
    y: height - 40,
    size: 20,
    color: black,
  });

  // === Rectangles ===
  console.log("Drawing rectangles...");

  page.drawText("Rectangles:", { x: 50, y: height - 80, size: 14, color: black });

  // Filled rectangle
  page.drawRectangle({
    x: 50,
    y: height - 150,
    width: 80,
    height: 50,
    color: red,
  });
  page.drawText("Filled", { x: 65, y: height - 175, size: 10, color: black });

  // Stroked rectangle (outline only)
  page.drawRectangle({
    x: 150,
    y: height - 150,
    width: 80,
    height: 50,
    borderColor: blue,
    borderWidth: 2,
  });
  page.drawText("Stroked", { x: 160, y: height - 175, size: 10, color: black });

  // Filled and stroked
  page.drawRectangle({
    x: 250,
    y: height - 150,
    width: 80,
    height: 50,
    color: rgb(0.9, 0.9, 0.5), // Light yellow
    borderColor: black,
    borderWidth: 1,
  });
  page.drawText("Both", { x: 275, y: height - 175, size: 10, color: black });

  // Rounded corners
  page.drawRectangle({
    x: 350,
    y: height - 150,
    width: 80,
    height: 50,
    color: green,
    cornerRadius: 10,
  });
  page.drawText("Rounded", { x: 360, y: height - 175, size: 10, color: black });

  // Semi-transparent
  page.drawRectangle({
    x: 450,
    y: height - 150,
    width: 80,
    height: 50,
    color: blue,
    opacity: 0.5,
  });
  page.drawText("50% opacity", { x: 453, y: height - 175, size: 10, color: black });

  // === Lines ===
  console.log("Drawing lines...");

  page.drawText("Lines:", { x: 50, y: height - 220, size: 14, color: black });

  // Simple line
  page.drawLine({
    start: { x: 50, y: height - 250 },
    end: { x: 150, y: height - 250 },
    thickness: 1,
    color: black,
  });
  page.drawText("1pt", { x: 160, y: height - 255, size: 10, color: black });

  // Thicker line
  page.drawLine({
    start: { x: 50, y: height - 270 },
    end: { x: 150, y: height - 270 },
    thickness: 3,
    color: black,
  });
  page.drawText("3pt", { x: 160, y: height - 275, size: 10, color: black });

  // Colored line
  page.drawLine({
    start: { x: 50, y: height - 290 },
    end: { x: 150, y: height - 290 },
    thickness: 2,
    color: red,
  });
  page.drawText("Colored", { x: 160, y: height - 295, size: 10, color: black });

  // Dashed line
  page.drawLine({
    start: { x: 50, y: height - 310 },
    end: { x: 150, y: height - 310 },
    thickness: 1,
    color: black,
    dashArray: [5, 3], // 5pt dash, 3pt gap
  });
  page.drawText("Dashed", { x: 160, y: height - 315, size: 10, color: black });

  // Dotted line
  page.drawLine({
    start: { x: 50, y: height - 330 },
    end: { x: 150, y: height - 330 },
    thickness: 2,
    color: black,
    dashArray: [1, 4],
    lineCap: "round",
  });
  page.drawText("Dotted", { x: 160, y: height - 335, size: 10, color: black });

  // Diagonal line
  page.drawLine({
    start: { x: 250, y: height - 250 },
    end: { x: 350, y: height - 330 },
    thickness: 2,
    color: blue,
  });
  page.drawText("Diagonal", { x: 280, y: height - 350, size: 10, color: black });

  // === Circles ===
  console.log("Drawing circles...");

  page.drawText("Circles:", { x: 50, y: height - 380, size: 14, color: black });

  // Filled circle
  page.drawCircle({
    x: 90,
    y: height - 440,
    radius: 30,
    color: red,
  });
  page.drawText("Filled", { x: 70, y: height - 490, size: 10, color: black });

  // Stroked circle
  page.drawCircle({
    x: 180,
    y: height - 440,
    radius: 30,
    borderColor: blue,
    borderWidth: 2,
  });
  page.drawText("Stroked", { x: 155, y: height - 490, size: 10, color: black });

  // Filled and stroked
  page.drawCircle({
    x: 270,
    y: height - 440,
    radius: 30,
    color: rgb(0.8, 0.9, 1.0), // Light blue
    borderColor: black,
    borderWidth: 1,
  });
  page.drawText("Both", { x: 255, y: height - 490, size: 10, color: black });

  // Semi-transparent
  page.drawCircle({
    x: 360,
    y: height - 440,
    radius: 30,
    color: green,
    opacity: 0.5,
  });
  page.drawText("50% opacity", { x: 325, y: height - 490, size: 10, color: black });

  // === Ellipses ===
  console.log("Drawing ellipses...");

  page.drawText("Ellipses:", { x: 50, y: height - 520, size: 14, color: black });

  // Horizontal ellipse
  page.drawEllipse({
    x: 100,
    y: height - 580,
    xRadius: 50,
    yRadius: 25,
    color: rgb(1.0, 0.8, 0.5), // Orange
  });
  page.drawText("Horizontal", { x: 65, y: height - 620, size: 10, color: black });

  // Vertical ellipse
  page.drawEllipse({
    x: 220,
    y: height - 580,
    xRadius: 25,
    yRadius: 40,
    color: rgb(0.8, 0.5, 1.0), // Purple
  });
  page.drawText("Vertical", { x: 195, y: height - 640, size: 10, color: black });

  // Stroked ellipse
  page.drawEllipse({
    x: 340,
    y: height - 580,
    xRadius: 50,
    yRadius: 30,
    borderColor: black,
    borderWidth: 2,
  });
  page.drawText("Stroked", { x: 315, y: height - 630, size: 10, color: black });

  // === Overlapping shapes with opacity ===
  console.log("Drawing overlapping shapes...");

  page.drawText("Overlapping:", { x: 50, y: height - 680, size: 14, color: black });

  // Draw overlapping circles to show blending
  page.drawCircle({
    x: 100,
    y: height - 740,
    radius: 35,
    color: red,
    opacity: 0.6,
  });

  page.drawCircle({
    x: 135,
    y: height - 740,
    radius: 35,
    color: green,
    opacity: 0.6,
  });

  page.drawCircle({
    x: 117,
    y: height - 710,
    radius: 35,
    color: blue,
    opacity: 0.6,
  });

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("04-drawing/shapes-examples.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);
}

main().catch(console.error);
