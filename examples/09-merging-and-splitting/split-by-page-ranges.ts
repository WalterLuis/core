/**
 * Example: Split PDF by Page Ranges
 *
 * This example demonstrates extracting specific page ranges from a PDF.
 *
 * Run: npx tsx examples/09-merging-and-splitting/split-by-page-ranges.ts
 */

import { black, PDF } from "../../src/index";
import { formatBytes, saveOutput } from "../utils";

async function main() {
  console.log("Splitting PDF by page ranges...\n");

  // Create a multi-page PDF (simulating a book with chapters)
  console.log("=== Creating Source PDF (Book with Chapters) ===\n");

  const chapters = [
    { title: "Chapter 1: Introduction", pages: [1, 2, 3] },
    { title: "Chapter 2: Getting Started", pages: [4, 5, 6, 7] },
    { title: "Chapter 3: Advanced Topics", pages: [8, 9, 10] },
    { title: "Appendix", pages: [11, 12] },
  ];

  const totalPages = 12;
  const pdf = PDF.create();

  for (let i = 1; i <= totalPages; i++) {
    pdf.addPage({ size: "letter" });
    const page = pdf.getPage(i - 1);
    if (page) {
      // Find which chapter this page belongs to
      const chapter = chapters.find(c => c.pages.includes(i));
      const chapterTitle = chapter?.title || "Unknown";

      page.drawText(chapterTitle, {
        x: 150,
        y: page.height - 100,
        size: 24,
        color: black,
      });
      page.drawText(`Page ${i}`, {
        x: 250,
        y: page.height - 150,
        size: 18,
        color: black,
      });
    }
  }

  const sourceBytes = await pdf.save();
  console.log(`Source document: ${pdf.getPageCount()} pages, ${formatBytes(sourceBytes.length)}`);
  console.log("\nChapter structure:");
  for (const chapter of chapters) {
    console.log(
      `  ${chapter.title}: pages ${chapter.pages[0]}-${chapter.pages[chapter.pages.length - 1]}`,
    );
  }

  // Extract each chapter as a separate PDF
  console.log("\n=== Extracting Chapters ===\n");

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    // Convert 1-based page numbers to 0-based indices
    const indices = chapter.pages.map(p => p - 1);

    const extracted = await pdf.extractPages(indices);
    const extractedBytes = await extracted.save();

    // Create safe filename
    const safeName = chapter.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const outputPath = await saveOutput(`09-merging-and-splitting/${safeName}.pdf`, extractedBytes);

    console.log(`${chapter.title}:`);
    console.log(`  Pages: ${chapter.pages.join(", ")}`);
    console.log(`  Size: ${formatBytes(extractedBytes.length)}`);
    console.log(`  Output: ${outputPath}`);
    console.log();
  }

  // Extract specific non-contiguous pages (e.g., table of contents and index)
  console.log("=== Extracting Non-Contiguous Pages ===\n");

  // Extract first and last page of each chapter (for a summary document)
  const summaryPages = [0, 2, 3, 6, 7, 9, 10, 11]; // 0-based indices
  const summary = await pdf.extractPages(summaryPages);
  const summaryBytes = await summary.save();
  const summaryPath = await saveOutput(
    "09-merging-and-splitting/chapter-summaries.pdf",
    summaryBytes,
  );

  console.log("Chapter summaries (first and last of each chapter):");
  console.log(`  Pages: ${summaryPages.map(i => i + 1).join(", ")}`);
  console.log(`  Size: ${formatBytes(summaryBytes.length)}`);
  console.log(`  Output: ${summaryPath}`);

  console.log("\n=== Split Complete ===");
}

main().catch(console.error);
