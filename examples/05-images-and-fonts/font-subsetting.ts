/**
 * Example: Font Subsetting
 *
 * This example demonstrates that embedded fonts are automatically subsetted
 * to include only the glyphs actually used, keeping file size small.
 *
 * Run: npx tsx examples/05-images-and-fonts/font-subsetting.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Demonstrating font subsetting...\n");

  // Load a font
  const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
  console.log(`Original font file: ${formatBytes(fontBytes.length)}`);

  // === Document 1: Using few characters ===
  console.log("\n=== Creating document with few characters ===");

  const pdf1 = PDF.create();
  pdf1.addPage({ size: "letter" });
  const page1 = pdf1.getPage(0);

  const font1 = pdf1.embedFont(fontBytes);

  if (page1) {
    page1.drawText("Font Subsetting Demo", {
      x: 180,
      y: page1.height - 40,
      size: 20,
      color: black,
    });

    // Use only basic characters: A-Z, 0-9
    page1.drawText("ABC", {
      x: 50,
      y: page1.height - 100,
      size: 24,
      color: black,
      font: font1,
    });

    page1.drawText("This uses only a few characters from the font.", {
      x: 50,
      y: page1.height - 150,
      size: 12,
      color: black,
    });

    page1.drawText("The font will be subsetted to include only:", {
      x: 50,
      y: page1.height - 180,
      size: 12,
      color: black,
    });

    page1.drawText("A, B, C (plus .notdef)", {
      x: 70,
      y: page1.height - 200,
      size: 12,
      color: black,
    });
  }

  const bytes1 = await pdf1.save();
  const path1 = await saveOutput("05-images-and-fonts/subset-few-chars.pdf", bytes1);
  console.log(`Few characters document: ${formatBytes(bytes1.length)}`);
  console.log(`Saved: ${path1}`);

  // === Document 2: Using many characters ===
  console.log("\n=== Creating document with many characters ===");

  const pdf2 = PDF.create();
  pdf2.addPage({ size: "letter" });
  const page2 = pdf2.getPage(0);

  const font2 = pdf2.embedFont(fontBytes);

  if (page2) {
    page2.drawText("Font Subsetting Demo", {
      x: 180,
      y: page2.height - 40,
      size: 20,
      color: black,
    });

    // Use many more characters
    const text = `The quick brown fox jumps over the lazy dog.
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789
!@#$%^&*()_+-=[]{}|;':",.<>?/~\``;

    let yPos = page2.height - 100;
    for (const line of text.split("\n")) {
      page2.drawText(line, {
        x: 50,
        y: yPos,
        size: 14,
        color: black,
        font: font2,
      });
      yPos -= 25;
    }

    page2.drawText("This document uses many more characters.", {
      x: 50,
      y: yPos - 30,
      size: 12,
      color: black,
    });

    page2.drawText("The subset will be larger but still smaller than the full font.", {
      x: 50,
      y: yPos - 50,
      size: 12,
      color: black,
    });
  }

  const bytes2 = await pdf2.save();
  const path2 = await saveOutput("05-images-and-fonts/subset-many-chars.pdf", bytes2);
  console.log(`Many characters document: ${formatBytes(bytes2.length)}`);
  console.log(`Saved: ${path2}`);

  // === Document 3: Using the full alphabet plus numbers ===
  console.log("\n=== Creating document with full charset ===");

  const pdf3 = PDF.create();
  pdf3.addPage({ size: "letter" });
  const page3 = pdf3.getPage(0);

  const font3 = pdf3.embedFont(fontBytes);

  if (page3) {
    page3.drawText("Full Character Set", {
      x: 200,
      y: page3.height - 40,
      size: 20,
      color: black,
    });

    // Create a comprehensive character grid
    const allChars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
      "!\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~";

    let yPos = page3.height - 80;
    let xPos = 50;
    let charsPerRow = 0;

    for (const char of allChars) {
      page3.drawText(char, {
        x: xPos,
        y: yPos,
        size: 14,
        color: black,
        font: font3,
      });
      xPos += 15;
      charsPerRow++;

      if (charsPerRow >= 35) {
        charsPerRow = 0;
        xPos = 50;
        yPos -= 25;
      }
    }

    page3.drawText(`Total unique characters: ${allChars.length}`, {
      x: 50,
      y: yPos - 50,
      size: 12,
      color: black,
    });
  }

  const bytes3 = await pdf3.save();
  const path3 = await saveOutput("05-images-and-fonts/subset-full-charset.pdf", bytes3);
  console.log(`Full charset document: ${formatBytes(bytes3.length)}`);
  console.log(`Saved: ${path3}`);

  // Summary
  console.log("\n=== Summary ===");
  console.log(`Original font size: ${formatBytes(fontBytes.length)}`);
  console.log(`Document 1 (few chars): ${formatBytes(bytes1.length)}`);
  console.log(`Document 2 (many chars): ${formatBytes(bytes2.length)}`);
  console.log(`Document 3 (full charset): ${formatBytes(bytes3.length)}`);

  console.log("\n=== How Subsetting Works ===");
  console.log("1. The library tracks which characters are used in drawText()");
  console.log("2. During save, only the used glyphs are included in the PDF");
  console.log("3. A subset tag (e.g., 'ABCDEF+FontName') identifies the subset");
  console.log("4. Smaller PDFs = faster loading and less bandwidth");
  console.log("");
  console.log("Benefits:");
  console.log("  - Reduced file size (often 10-50x smaller than full font)");
  console.log("  - Automatic - no configuration needed");
  console.log("  - Full Unicode support preserved for used characters");
}

main().catch(console.error);
