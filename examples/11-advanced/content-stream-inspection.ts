/**
 * Example: Content Stream Inspection
 *
 * This example demonstrates inspecting PDF content streams to understand
 * how page content is structured internally.
 *
 * Run: npx tsx examples/11-advanced/content-stream-inspection.ts
 */

import { black, PDF, PdfArray, PdfRef, PdfStream, rgb } from "../../src/index";

async function main() {
  console.log("Inspecting PDF content streams...\n");

  console.log("=== What is a Content Stream? ===\n");

  console.log("A PDF content stream contains:");
  console.log("- Graphics operators (moveto, lineto, fill, stroke)");
  console.log("- Text operators (begin text, show text, set font)");
  console.log("- State operators (save, restore, set color)");
  console.log("- XObject references (images, forms)");
  console.log("- Usually compressed with FlateDecode\n");

  // Create a PDF with various content
  console.log("=== Creating Sample Document ===\n");

  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });
  const page = pdf.getPage(0);

  if (page) {
    // Draw various content to see in the stream
    page.drawText("Content Stream Demo", {
      x: 180,
      y: page.height - 100,
      size: 28,
      color: black,
    });

    page.drawRectangle({
      x: 100,
      y: 500,
      width: 200,
      height: 100,
      color: rgb(0.8, 0.2, 0.2),
      borderColor: black,
      borderWidth: 2,
    });

    page.drawLine({
      start: { x: 100, y: 400 },
      end: { x: 300, y: 400 },
      color: rgb(0, 0, 0.8),
      thickness: 3,
    });

    page.drawCircle({
      x: 450,
      y: 550,
      radius: 50,
      color: rgb(0.2, 0.8, 0.2),
    });
  }

  // Save and reload to get content streams
  const bytes = await pdf.save();
  const loaded = await PDF.load(bytes);

  console.log("=== Examining Page Content ===\n");

  const loadedPage = loaded.getPage(0);
  if (loadedPage) {
    const contents = loadedPage.dict.get("Contents");

    console.log(`Contents entry type: ${contents?.constructor.name}`);

    if (contents instanceof PdfRef) {
      // Single content stream
      const stream = loaded.getObject(contents);
      if (stream instanceof PdfStream) {
        inspectStream(stream, "Page content stream");
      }
    } else if (contents instanceof PdfArray) {
      // Array of content streams
      console.log(`Page has ${contents.length} content streams:\n`);
      for (let i = 0; i < contents.length; i++) {
        const ref = contents.at(i);
        if (ref instanceof PdfRef) {
          const stream = loaded.getObject(ref);
          if (stream instanceof PdfStream) {
            inspectStream(stream, `Content stream ${i + 1}`);
          }
        }
      }
    }
  }

  console.log("\n=== Common Content Stream Operators ===\n");

  console.log("Graphics State:");
  console.log("  q      - Save graphics state");
  console.log("  Q      - Restore graphics state");
  console.log("  cm     - Concatenate transformation matrix");
  console.log("  w      - Set line width");
  console.log();
  console.log("Path Construction:");
  console.log("  m      - Move to (start new subpath)");
  console.log("  l      - Line to");
  console.log("  c      - Curve to (Bézier)");
  console.log("  re     - Rectangle");
  console.log("  h      - Close path");
  console.log();
  console.log("Path Painting:");
  console.log("  S      - Stroke path");
  console.log("  f      - Fill path (nonzero winding)");
  console.log("  f*     - Fill path (even-odd)");
  console.log("  B      - Fill and stroke");
  console.log("  n      - End path (no paint)");
  console.log();
  console.log("Color:");
  console.log("  g      - Set gray (fill)");
  console.log("  G      - Set gray (stroke)");
  console.log("  rg     - Set RGB (fill)");
  console.log("  RG     - Set RGB (stroke)");
  console.log("  k      - Set CMYK (fill)");
  console.log("  K      - Set CMYK (stroke)");
  console.log();
  console.log("Text:");
  console.log("  BT     - Begin text object");
  console.log("  ET     - End text object");
  console.log("  Tf     - Set font and size");
  console.log("  Td     - Move text position");
  console.log("  Tj     - Show text");
  console.log("  TJ     - Show text with positioning");

  console.log("\n=== Example Content Stream ===\n");

  console.log("A simple red rectangle might look like:");
  console.log();
  console.log("  q                    % Save state");
  console.log("  0.8 0.2 0.2 rg       % Set fill color (RGB)");
  console.log("  100 500 200 100 re   % Rectangle at (100,500) size 200x100");
  console.log("  f                    % Fill");
  console.log("  Q                    % Restore state");

  console.log("\n=== Practical Applications ===\n");

  console.log("Understanding content streams is useful for:");
  console.log("- Debugging rendering issues");
  console.log("- Implementing text extraction");
  console.log("- Custom content stream generation");
  console.log("- Analyzing PDF structure");
  console.log("- Security auditing (finding hidden content)");
}

function inspectStream(stream: PdfStream, label: string): void {
  console.log(`${label}:`);

  // Get stream properties - PdfStream extends PdfDict
  const filter = stream.getName("Filter");
  const length = stream.getNumber("Length");

  console.log(`  Filter: ${filter?.value || "(none)"}`);
  console.log(`  Encoded length: ${length?.value || "unknown"}`);

  // Get decoded data
  try {
    const decoded = stream.getDecodedData();
    console.log(`  Decoded length: ${decoded.length} bytes`);

    // Show first part of content as text
    const text = new TextDecoder().decode(decoded.slice(0, 500));
    const preview = text.replace(/\r?\n/g, " ").substring(0, 200);
    console.log(`  Preview: ${preview}...`);

    // Count operators
    const operators = text.match(/\b[a-zA-Z*]+\b/g) || [];
    const uniqueOps = [...new Set(operators)];
    console.log(
      `  Operators found: ${uniqueOps.slice(0, 15).join(", ")}${uniqueOps.length > 15 ? "..." : ""}`,
    );
  } catch (err) {
    console.log(`  Error decoding: ${String(err)}`);
  }

  console.log();
}

main().catch(console.error);
