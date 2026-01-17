/**
 * Example: Document Language
 *
 * This example demonstrates setting the document language using RFC 3066
 * language tags for accessibility and text-to-speech applications.
 *
 * Run: npx tsx examples/06-metadata/document-language.ts
 */

import { black, PDF, rgb } from "../../src/index";
import { saveOutput } from "../utils";

async function main() {
  console.log("Setting document language...\n");

  // === English document ===
  console.log("=== Creating English Document ===\n");

  const pdfEn = PDF.create();
  pdfEn.addPage({ size: "letter" });

  const pageEn = pdfEn.getPage(0);
  if (pageEn) {
    pageEn.drawText("English Document", {
      x: 200,
      y: pageEn.height - 50,
      size: 24,
      color: black,
    });

    pageEn.drawText("This document is marked as English (US).", {
      x: 50,
      y: pageEn.height - 100,
      size: 14,
      color: black,
    });

    pageEn.drawText("Language tag: en-US", {
      x: 50,
      y: pageEn.height - 130,
      size: 12,
      color: rgb(0.3, 0.3, 0.6),
    });
  }

  // Set language to English (US)
  pdfEn.setLanguage("en-US");
  pdfEn.setTitle("English Document Example");

  console.log(`Language set: ${pdfEn.getLanguage()}`);

  const bytesEn = await pdfEn.save();
  const pathEn = await saveOutput("06-metadata/language-english.pdf", bytesEn);
  console.log(`Saved: ${pathEn}`);

  // === German document ===
  console.log("\n=== Creating German Document ===\n");

  const pdfDe = PDF.create();
  pdfDe.addPage({ size: "a4" }); // Use A4 for European document

  const pageDe = pdfDe.getPage(0);
  if (pageDe) {
    pageDe.drawText("Deutsches Dokument", {
      x: 180,
      y: pageDe.height - 50,
      size: 24,
      color: black,
    });

    pageDe.drawText("Dieses Dokument ist als Deutsch (Deutschland) gekennzeichnet.", {
      x: 50,
      y: pageDe.height - 100,
      size: 14,
      color: black,
    });

    pageDe.drawText("Sprachkennzeichen: de-DE", {
      x: 50,
      y: pageDe.height - 130,
      size: 12,
      color: rgb(0.3, 0.3, 0.6),
    });
  }

  // Set language to German
  pdfDe.setLanguage("de-DE");
  pdfDe.setTitle("Deutsches Dokument Beispiel");

  console.log(`Language set: ${pdfDe.getLanguage()}`);

  const bytesDe = await pdfDe.save();
  const pathDe = await saveOutput("06-metadata/language-german.pdf", bytesDe);
  console.log(`Saved: ${pathDe}`);

  // === Japanese document ===
  console.log("\n=== Creating Japanese Document ===\n");

  const pdfJa = PDF.create();
  pdfJa.addPage({ size: "a4" });

  const pageJa = pdfJa.getPage(0);
  if (pageJa) {
    pageJa.drawText("Japanese Document", {
      x: 200,
      y: pageJa.height - 50,
      size: 24,
      color: black,
    });

    pageJa.drawText("This document is marked as Japanese.", {
      x: 50,
      y: pageJa.height - 100,
      size: 14,
      color: black,
    });

    pageJa.drawText("Language tag: ja", {
      x: 50,
      y: pageJa.height - 130,
      size: 12,
      color: rgb(0.3, 0.3, 0.6),
    });
  }

  // Set language to Japanese
  pdfJa.setLanguage("ja");
  pdfJa.setTitle("Japanese Document Example");

  console.log(`Language set: ${pdfJa.getLanguage()}`);

  const bytesJa = await pdfJa.save();
  const pathJa = await saveOutput("06-metadata/language-japanese.pdf", bytesJa);
  console.log(`Saved: ${pathJa}`);

  // === Common language codes ===
  console.log("\n=== Common RFC 3066 Language Tags ===");
  console.log("\nLanguage only:");
  console.log("  en    - English");
  console.log("  de    - German");
  console.log("  fr    - French");
  console.log("  es    - Spanish");
  console.log("  ja    - Japanese");
  console.log("  zh    - Chinese");
  console.log("  ko    - Korean");
  console.log("  ar    - Arabic");

  console.log("\nLanguage + Region:");
  console.log("  en-US - English (United States)");
  console.log("  en-GB - English (United Kingdom)");
  console.log("  de-DE - German (Germany)");
  console.log("  de-AT - German (Austria)");
  console.log("  fr-FR - French (France)");
  console.log("  fr-CA - French (Canada)");
  console.log("  es-ES - Spanish (Spain)");
  console.log("  es-MX - Spanish (Mexico)");
  console.log("  pt-BR - Portuguese (Brazil)");
  console.log("  pt-PT - Portuguese (Portugal)");
  console.log("  zh-CN - Chinese (Simplified, China)");
  console.log("  zh-TW - Chinese (Traditional, Taiwan)");

  // === Why language matters ===
  console.log("\n=== Why Document Language Matters ===");
  console.log("\n1. Accessibility");
  console.log("   - Screen readers use it to select the correct voice");
  console.log("   - Helps assistive technologies pronounce text correctly");
  console.log("");
  console.log("2. Text-to-Speech");
  console.log("   - Determines pronunciation rules and voice selection");
  console.log("   - Critical for multi-language documents");
  console.log("");
  console.log("3. Search and Indexing");
  console.log("   - Search engines use it for language-specific indexing");
  console.log("   - Improves search result relevance");
  console.log("");
  console.log("4. PDF/A Compliance");
  console.log("   - Required for PDF/A-1a and PDF/A-2a compliance");
  console.log("   - Part of accessibility requirements");

  // === Storage location ===
  console.log("\n=== Technical Note ===");
  console.log("Unlike other metadata (stored in Info dictionary),");
  console.log("the language is stored in the Catalog dictionary as /Lang.");
  console.log("This is per PDF specification (Table 28).");
}

main().catch(console.error);
