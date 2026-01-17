/**
 * Example: Draw Paths
 *
 * This example demonstrates how to use the PathBuilder API to draw custom
 * paths with moveTo, lineTo, curveTo, and closePath operations.
 *
 * Run: npx tsx examples/04-drawing/draw-paths.ts
 */

import { black, blue, green, PDF, red, rgb } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Drawing custom paths...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  const { height } = page;

  // Title
  page.drawText("Custom Path Drawing", {
    x: 200,
    y: height - 40,
    size: 20,
    color: black,
  });

  // === Triangle (using moveTo and lineTo) ===
  console.log("Drawing triangle...");

  page.drawText("Triangle:", { x: 50, y: height - 80, size: 12, color: black });

  page
    .drawPath()
    .moveTo(100, height - 150)
    .lineTo(150, height - 100)
    .lineTo(50, height - 100)
    .close()
    .fill({ color: red });

  // Stroked triangle
  page
    .drawPath()
    .moveTo(220, height - 150)
    .lineTo(270, height - 100)
    .lineTo(170, height - 100)
    .close()
    .stroke({ borderColor: blue, borderWidth: 2 });

  // === Star shape ===
  console.log("Drawing star...");

  page.drawText("Star:", { x: 50, y: height - 190, size: 12, color: black });

  // Calculate star points
  const starCenterX = 100;
  const starCenterY = height - 270;
  const outerRadius = 40;
  const innerRadius = 20;
  const points = 5;

  const starPath = page.drawPath();

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / points) * i - Math.PI / 2;
    const x = starCenterX + radius * Math.cos(angle);
    const y = starCenterY + radius * Math.sin(angle);

    if (i === 0) {
      starPath.moveTo(x, y);
    } else {
      starPath.lineTo(x, y);
    }
  }

  starPath.close().fill({ color: rgb(1.0, 0.8, 0.0) }); // Gold

  // === Bezier Curves ===
  console.log("Drawing bezier curves...");

  page.drawText("Bezier Curves:", { x: 50, y: height - 330, size: 12, color: black });

  // Simple quadratic-like curve using cubic bezier
  page
    .drawPath()
    .moveTo(50, height - 400)
    .curveTo(100, height - 340, 150, height - 340, 200, height - 400)
    .stroke({ borderColor: blue, borderWidth: 2 });

  // S-curve
  page
    .drawPath()
    .moveTo(250, height - 400)
    .curveTo(300, height - 340, 320, height - 460, 400, height - 400)
    .stroke({ borderColor: green, borderWidth: 3 });

  // === Heart Shape ===
  console.log("Drawing heart...");

  page.drawText("Heart:", { x: 50, y: height - 440, size: 12, color: black });

  const heartX = 100;
  const heartY = height - 520;
  const heartSize = 40;

  page
    .drawPath()
    .moveTo(heartX, heartY)
    .curveTo(
      heartX - heartSize,
      heartY + heartSize * 0.6,
      heartX - heartSize,
      heartY + heartSize * 1.2,
      heartX,
      heartY + heartSize * 0.6,
    )
    .curveTo(
      heartX + heartSize,
      heartY + heartSize * 1.2,
      heartX + heartSize,
      heartY + heartSize * 0.6,
      heartX,
      heartY,
    )
    .fill({ color: red });

  // === Complex polygon (hexagon) ===
  console.log("Drawing hexagon...");

  page.drawText("Hexagon:", { x: 250, y: height - 440, size: 12, color: black });

  const hexCenterX = 300;
  const hexCenterY = height - 520;
  const hexRadius = 40;
  const hexPath = page.drawPath();

  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const x = hexCenterX + hexRadius * Math.cos(angle);
    const y = hexCenterY + hexRadius * Math.sin(angle);

    if (i === 0) {
      hexPath.moveTo(x, y);
    } else {
      hexPath.lineTo(x, y);
    }
  }

  hexPath.close().fillAndStroke({
    color: rgb(0.7, 0.9, 0.7), // Light green
    borderColor: black,
    borderWidth: 2,
  });

  // === Rounded rectangle using curves ===
  console.log("Drawing rounded rectangle with curves...");

  page.drawText("Custom Rounded Rect:", { x: 50, y: height - 580, size: 12, color: black });

  const rectX = 50;
  const rectY = height - 700;
  const rectW = 120;
  const rectH = 80;
  const radius = 15;

  page
    .drawPath()
    // Start at top-left corner (after the curve)
    .moveTo(rectX + radius, rectY + rectH)
    // Top edge
    .lineTo(rectX + rectW - radius, rectY + rectH)
    // Top-right corner
    .curveTo(
      rectX + rectW,
      rectY + rectH,
      rectX + rectW,
      rectY + rectH,
      rectX + rectW,
      rectY + rectH - radius,
    )
    // Right edge
    .lineTo(rectX + rectW, rectY + radius)
    // Bottom-right corner
    .curveTo(rectX + rectW, rectY, rectX + rectW, rectY, rectX + rectW - radius, rectY)
    // Bottom edge
    .lineTo(rectX + radius, rectY)
    // Bottom-left corner
    .curveTo(rectX, rectY, rectX, rectY, rectX, rectY + radius)
    // Left edge
    .lineTo(rectX, rectY + rectH - radius)
    // Top-left corner
    .curveTo(rectX, rectY + rectH, rectX, rectY + rectH, rectX + radius, rectY + rectH)
    .close()
    .fillAndStroke({
      color: rgb(0.9, 0.85, 0.95), // Light purple
      borderColor: rgb(0.5, 0.3, 0.7),
      borderWidth: 2,
    });

  // === Arrow ===
  console.log("Drawing arrow...");

  page.drawText("Arrow:", { x: 250, y: height - 580, size: 12, color: black });

  const arrowX = 250;
  const arrowY = height - 680;

  page
    .drawPath()
    .moveTo(arrowX, arrowY + 20)
    .lineTo(arrowX + 60, arrowY + 20)
    .lineTo(arrowX + 60, arrowY + 35)
    .lineTo(arrowX + 90, arrowY)
    .lineTo(arrowX + 60, arrowY - 35)
    .lineTo(arrowX + 60, arrowY - 20)
    .lineTo(arrowX, arrowY - 20)
    .close()
    .fill({ color: blue });

  // === Multiple subpaths ===
  console.log("Drawing multiple subpaths...");

  page.drawText("Multiple Subpaths:", { x: 400, y: height - 440, size: 12, color: black });

  // Draw two separate rectangles in one path
  page
    .drawPath()
    // First rectangle
    .moveTo(400, height - 500)
    .lineTo(450, height - 500)
    .lineTo(450, height - 550)
    .lineTo(400, height - 550)
    .close()
    // Second rectangle (new subpath)
    .moveTo(460, height - 480)
    .lineTo(510, height - 480)
    .lineTo(510, height - 530)
    .lineTo(460, height - 530)
    .close()
    .fill({ color: rgb(0.4, 0.6, 0.9) });

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("04-drawing/path-examples.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);
}

main().catch(console.error);
