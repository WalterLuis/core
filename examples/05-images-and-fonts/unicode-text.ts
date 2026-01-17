/**
 * Example: Unicode Text
 *
 * This example demonstrates how to embed a font that supports Unicode
 * and draw text containing non-ASCII characters including CJK characters,
 * accented characters, and various scripts.
 *
 * Run: npx tsx examples/05-images-and-fonts/unicode-text.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { formatBytes, loadFixture, saveOutput } from "../utils";

async function main() {
  console.log("Drawing Unicode text...\n");

  // Create a new PDF
  const pdf = PDF.create();
  pdf.addPage({ size: "letter" });

  const page = pdf.getPage(0);
  if (!page) {
    throw new Error("Failed to get page");
  }

  // Title
  page.drawText("Unicode Text Support", {
    x: 190,
    y: page.height - 40,
    size: 20,
    color: black,
  });

  // Load fonts with Unicode support
  console.log("Loading Unicode fonts...");

  // Load Liberation Sans for basic Latin/European characters
  const latinFont = pdf.embedFont(await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf"));
  console.log(`Loaded Latin font: ${latinFont.baseFontName}`);

  // Load Noto Sans JP for Japanese characters
  let japaneseFont = latinFont;
  try {
    japaneseFont = pdf.embedFont(await loadFixture("fonts", "ttf/NotoSansJP-Regular.ttf"));
    console.log(`Loaded Japanese font: ${japaneseFont.baseFontName}`);
  } catch {
    console.log("Japanese font not found, using Latin font");
  }

  // Load Noto Sans SC for Simplified Chinese
  let chineseFont = latinFont;
  try {
    chineseFont = pdf.embedFont(await loadFixture("fonts", "ttf/NotoSansSC-Regular.ttf"));
    console.log(`Loaded Chinese font: ${chineseFont.baseFontName}`);
  } catch {
    console.log("Chinese font not found, using Latin font");
  }

  // Load Noto Sans KR for Korean
  let koreanFont = latinFont;
  try {
    koreanFont = pdf.embedFont(await loadFixture("fonts", "ttf/NotoSansKR-Regular.ttf"));
    console.log(`Loaded Korean font: ${koreanFont.baseFontName}`);
  } catch {
    console.log("Korean font not found, using Latin font");
  }

  // Load Bengali font
  let bengaliFont = latinFont;
  try {
    bengaliFont = pdf.embedFont(await loadFixture("fonts", "ttf/Lohit-Bengali.ttf"));
    console.log(`Loaded Bengali font: ${bengaliFont.baseFontName}`);
  } catch {
    console.log("Bengali font not found, using Latin font");
  }

  let yPos = page.height - 80;

  // === European characters with accents ===
  page.drawText("European (Latin with accents):", {
    x: 50,
    y: yPos,
    size: 12,
    color: black,
  });
  yPos -= 25;

  const europeanTexts = [
    { label: "French", text: "Bonjour! Ça va? L'été est très beau." },
    { label: "German", text: "Grüß Gott! Können Sie mir helfen?" },
    { label: "Spanish", text: "¡Hola! ¿Cómo está usted? Señor" },
    { label: "Portuguese", text: "Olá! Você fala português? São Paulo" },
    { label: "Polish", text: "Dzień dobry! Żółć źrebięcia" },
  ];

  for (const item of europeanTexts) {
    page.drawText(`${item.label}: ${item.text}`, {
      x: 70,
      y: yPos,
      size: 11,
      color: rgb(0.2, 0.2, 0.4),
      font: latinFont,
    });
    yPos -= 20;
  }

  // === Japanese ===
  yPos -= 15;
  page.drawText("Japanese (日本語):", { x: 50, y: yPos, size: 12, color: black });
  yPos -= 25;

  page.drawText("こんにちは世界！", {
    x: 70,
    y: yPos,
    size: 14,
    color: rgb(0.4, 0.2, 0.2),
    font: japaneseFont,
  });
  yPos -= 25;

  page.drawText("日本語のテキストです。", {
    x: 70,
    y: yPos,
    size: 14,
    color: rgb(0.4, 0.2, 0.2),
    font: japaneseFont,
  });
  yPos -= 30;

  // === Chinese ===
  page.drawText("Chinese (中文):", { x: 50, y: yPos, size: 12, color: black });
  yPos -= 25;

  page.drawText("你好世界！", {
    x: 70,
    y: yPos,
    size: 14,
    color: rgb(0.2, 0.4, 0.2),
    font: chineseFont,
  });
  yPos -= 25;

  page.drawText("欢迎使用PDF库。", {
    x: 70,
    y: yPos,
    size: 14,
    color: rgb(0.2, 0.4, 0.2),
    font: chineseFont,
  });
  yPos -= 30;

  // === Korean ===
  page.drawText("Korean (한국어):", { x: 50, y: yPos, size: 12, color: black });
  yPos -= 25;

  page.drawText("안녕하세요 세계!", {
    x: 70,
    y: yPos,
    size: 14,
    color: rgb(0.2, 0.2, 0.4),
    font: koreanFont,
  });
  yPos -= 25;

  page.drawText("한글 텍스트입니다.", {
    x: 70,
    y: yPos,
    size: 14,
    color: rgb(0.2, 0.2, 0.4),
    font: koreanFont,
  });
  yPos -= 30;

  // === Bengali ===
  page.drawText("Bengali (বাংলা):", { x: 50, y: yPos, size: 12, color: black });
  yPos -= 25;

  page.drawText("হ্যালো বিশ্ব", {
    x: 70,
    y: yPos,
    size: 14,
    color: rgb(0.4, 0.3, 0.2),
    font: bengaliFont,
  });
  yPos -= 30;

  // === Special characters and symbols ===
  page.drawText("Special Characters:", { x: 50, y: yPos, size: 12, color: black });
  yPos -= 25;

  page.drawText("Currency: € £ ¥ ¢ ₹ ₽", {
    x: 70,
    y: yPos,
    size: 12,
    color: rgb(0.3, 0.3, 0.3),
    font: latinFont,
  });
  yPos -= 20;

  page.drawText("Math: ± × ÷ √ ∑ ∏ ∫ ≈ ≠ ≤ ≥", {
    x: 70,
    y: yPos,
    size: 12,
    color: rgb(0.3, 0.3, 0.3),
    font: latinFont,
  });
  yPos -= 20;

  page.drawText("Arrows: ← → ↑ ↓ ↔ ↕", {
    x: 70,
    y: yPos,
    size: 12,
    color: rgb(0.3, 0.3, 0.3),
    font: latinFont,
  });
  yPos -= 30;

  // === Notes ===
  page.drawText(
    "Note: Different scripts require different fonts with appropriate glyph coverage.",
    {
      x: 50,
      y: yPos,
      size: 10,
      color: rgb(0.5, 0.5, 0.5),
    },
  );

  // Save the document
  console.log("\n=== Saving Document ===");
  const savedBytes = await pdf.save();
  const outputPath = await saveOutput("05-images-and-fonts/unicode-text.pdf", savedBytes);

  console.log(`Output: ${outputPath}`);
  console.log(`Size: ${formatBytes(savedBytes.length)}`);

  console.log("\n=== Notes ===");
  console.log("Unicode support requires:");
  console.log("  - Fonts with glyphs for the target scripts");
  console.log("  - CJK fonts for Chinese/Japanese/Korean");
  console.log("  - Script-specific fonts for Indic languages");
  console.log("  - The library handles encoding automatically");
}

main().catch(console.error);
