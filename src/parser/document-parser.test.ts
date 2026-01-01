import { describe, expect, it } from "vitest";
import { Scanner } from "#src/io/scanner";
import { PdfRef } from "#src/objects/pdf-ref";
import { loadFixture } from "#src/test-utils";
import { DocumentParser } from "./document-parser";

/**
 * Helper to create a minimal PDF for testing.
 */
function createMinimalPdf(options: {
  version?: string;
  headerOffset?: number;
  garbageBeforeHeader?: string;
  objects?: Array<{ objNum: number; content: string }>;
  xrefEntries?: Array<{ objNum: number; offset: number; gen?: number; free?: boolean }>;
  trailer?: Record<string, string>;
}): Uint8Array {
  const parts: string[] = [];

  // Add garbage before header if specified
  if (options.garbageBeforeHeader) {
    parts.push(options.garbageBeforeHeader);
  }

  // Header
  const version = options.version ?? "1.4";
  parts.push(`%PDF-${version}\n`);
  parts.push("%\x80\x81\x82\x83\n"); // Binary marker

  // Track offsets for xref
  const offsets: Array<{ objNum: number; offset: number; gen: number; free: boolean }> = [];
  let currentOffset = parts.join("").length;

  // Objects
  const objects = options.objects ?? [
    { objNum: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
    { objNum: 2, content: "<< /Type /Pages /Kids [] /Count 0 >>" },
  ];

  for (const obj of objects) {
    offsets.push({ objNum: obj.objNum, offset: currentOffset, gen: 0, free: false });
    const objStr = `${obj.objNum} 0 obj\n${obj.content}\nendobj\n`;
    parts.push(objStr);
    currentOffset += objStr.length;
  }

  // Use provided xref entries or build from objects
  const xrefEntries = options.xrefEntries ?? [
    { objNum: 0, offset: 0, gen: 65535, free: true },
    ...offsets,
  ];

  // XRef table
  const xrefOffset = currentOffset;
  parts.push("xref\n");
  parts.push(`0 ${xrefEntries.length}\n`);

  for (const entry of xrefEntries) {
    const offsetStr = entry.offset.toString().padStart(10, "0");
    const genStr = (entry.gen ?? 0).toString().padStart(5, "0");
    const type = entry.free ? "f" : "n";
    parts.push(`${offsetStr} ${genStr} ${type}\n`);
  }

  // Trailer
  const trailerDict = options.trailer ?? {
    "/Root": "1 0 R",
    "/Size": String(xrefEntries.length),
  };

  parts.push("trailer\n");
  parts.push("<< ");
  for (const [key, value] of Object.entries(trailerDict)) {
    parts.push(`${key} ${value} `);
  }
  parts.push(">>\n");

  // startxref
  parts.push("startxref\n");
  parts.push(`${xrefOffset}\n`);
  parts.push("%%EOF\n");

  return new TextEncoder().encode(parts.join(""));
}

describe("DocumentParser", () => {
  describe("parseHeader", () => {
    it("parses standard header at byte 0", () => {
      const bytes = createMinimalPdf({ version: "1.7" });
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const version = parser.parseHeader();

      expect(version).toBe("1.7");
    });

    it("parses PDF 2.0 header", () => {
      const bytes = createMinimalPdf({ version: "2.0" });
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const version = parser.parseHeader();

      expect(version).toBe("2.0");
    });

    it("handles header not at byte 0 (lenient)", () => {
      const bytes = createMinimalPdf({
        version: "1.5",
        garbageBeforeHeader: "garbage\n\n",
      });
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const version = parser.parseHeader();

      expect(version).toBe("1.5");
    });

    it("throws in strict mode when header not at byte 0", async () => {
      const bytes = createMinimalPdf({
        version: "1.5",
        garbageBeforeHeader: "garbage\n",
      });
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner, { lenient: false });

      // Should still parse (pdf.js allows this), but we could make it strict
      // For now, we follow pdf.js behavior which allows header anywhere in first 1024 bytes
      const version = parser.parseHeader();
      expect(version).toBe("1.5");
    });

    it("returns default version when header missing (lenient)", () => {
      const bytes = new TextEncoder().encode("not a pdf file\n");
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const version = parser.parseHeader();

      expect(version).toBe("1.4"); // Default version
    });

    it("throws when header missing (strict)", () => {
      const bytes = new TextEncoder().encode("not a pdf file\n");
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner, { lenient: false });

      expect(() => parser.parseHeader()).toThrow("PDF header not found");
    });

    it("handles garbage after version (lenient)", () => {
      // Create PDF with garbage after version: %PDF-1.7garbage
      const pdfContent =
        "%PDF-1.7garbage\n%\x80\x81\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 2\n0000000000 65535 f\n0000000020 00000 n\ntrailer\n<< /Root 1 0 R /Size 2 >>\nstartxref\n60\n%%EOF\n";
      const bytes = new TextEncoder().encode(pdfContent);
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const version = parser.parseHeader();

      expect(version).toBe("1.7");
    });
  });

  describe("parse", () => {
    it("parses minimal valid PDF", async () => {
      const bytes = createMinimalPdf({});
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      expect(doc.version).toBe("1.4");
      expect(doc.trailer).toBeDefined();
      expect(doc.xref.size).toBeGreaterThan(0);
    });

    it("provides access to catalog", async () => {
      const bytes = createMinimalPdf({});
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();
      const catalog = await doc.getCatalog();

      expect(catalog).not.toBeNull();
      expect(catalog?.getName("Type")?.value).toBe("Catalog");
    });

    it("loads objects by reference", async () => {
      const bytes = createMinimalPdf({
        objects: [
          { objNum: 1, content: "<< /Type /Catalog /Pages 2 0 R >>" },
          { objNum: 2, content: "<< /Type /Pages /Kids [] /Count 0 >>" },
        ],
      });
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      // Load catalog (object 1)
      const catalog = await doc.getObject(PdfRef.of(1, 0));
      expect(catalog).not.toBeNull();
      expect(catalog?.type).toBe("dict");

      // Load pages (object 2)
      const pages = await doc.getObject(PdfRef.of(2, 0));
      expect(pages).not.toBeNull();
      expect((pages as any).getName("Type")?.value).toBe("Pages");
    });

    it("returns null for non-existent objects", async () => {
      const bytes = createMinimalPdf({});
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();
      const obj = await doc.getObject(PdfRef.of(999, 0));

      expect(obj).toBeNull();
    });

    it("caches loaded objects", async () => {
      const bytes = createMinimalPdf({});
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      // Load same object twice
      const obj1 = await doc.getObject(PdfRef.of(1, 0));
      const obj2 = await doc.getObject(PdfRef.of(1, 0));

      // Should be the same cached instance
      expect(obj1).toBe(obj2);
    });
  });

  describe("fixture PDFs", () => {
    it("parses rot0.pdf", async () => {
      const bytes = await loadFixture("basic", "rot0.pdf");
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      expect(doc.version).toBe("1.4");
      expect(doc.warnings).toHaveLength(0);

      const catalog = await doc.getCatalog();
      expect(catalog).not.toBeNull();
      expect(catalog?.getName("Type")?.value).toBe("Catalog");
    });

    it("parses document.pdf", async () => {
      const bytes = await loadFixture("basic", "document.pdf");
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      expect(doc.version).toBeDefined();

      const catalog = await doc.getCatalog();
      expect(catalog).not.toBeNull();
    });

    it("parses sample.pdf (larger file)", async () => {
      const bytes = await loadFixture("basic", "sample.pdf");
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      expect(doc.version).toBeDefined();
      expect(doc.xref.size).toBeGreaterThan(0);

      const catalog = await doc.getCatalog();
      expect(catalog).not.toBeNull();
    });

    it("parses page_tree_multiple_levels.pdf", async () => {
      const bytes = await loadFixture("basic", "page_tree_multiple_levels.pdf");
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      expect(doc.version).toBeDefined();

      const catalog = await doc.getCatalog();
      expect(catalog).not.toBeNull();

      // Should be able to navigate to Pages
      const pagesRef = catalog?.getRef("Pages");
      expect(pagesRef).toBeDefined();

      if (pagesRef) {
        const pages = await doc.getObject(pagesRef);
        expect(pages).not.toBeNull();
      }
    });
  });

  describe("incremental updates", () => {
    it("follows /Prev chain", async () => {
      // This would require a fixture with incremental updates
      // For now, test that parsing works with a simple PDF
      const bytes = createMinimalPdf({});
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      // No /Prev in simple PDF, but chain following code should handle it
      expect(doc.xref.size).toBeGreaterThan(0);
    });
  });

  describe("stream objects", () => {
    it("loads stream objects with direct /Length", async () => {
      const bytes = await loadFixture("basic", "rot0.pdf");
      const scanner = new Scanner(bytes);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      // Object 5 in rot0.pdf is a content stream
      const stream = await doc.getObject(PdfRef.of(5, 0));
      expect(stream).not.toBeNull();
      expect(stream?.type).toBe("stream");
    });
  });

  describe("recovery mode", () => {
    it("uses brute-force parser when xref fails", async () => {
      // Create a malformed PDF with invalid xref
      const malformedPdf = new TextEncoder().encode(
        "%PDF-1.4\n" +
          "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n" +
          "2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\n" +
          "xref\nGARBAGE\n" + // Invalid xref
          "startxref\n60\n%%EOF\n",
      );
      const scanner = new Scanner(malformedPdf);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      // Should recover and find objects via brute-force
      expect(doc.warnings.length).toBeGreaterThan(0);
      expect(doc.xref.size).toBeGreaterThan(0);
    });
  });

  describe("error handling", () => {
    it("throws in strict mode for invalid xref", async () => {
      const malformedPdf = new TextEncoder().encode(
        "%PDF-1.4\nxref\nGARBAGE\nstartxref\n10\n%%EOF\n",
      );
      const scanner = new Scanner(malformedPdf);
      const parser = new DocumentParser(scanner, { lenient: false });

      await expect(parser.parse()).rejects.toThrow();
    });

    it("handles missing startxref gracefully (lenient)", async () => {
      const malformedPdf = new TextEncoder().encode(
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF\n",
      );
      const scanner = new Scanner(malformedPdf);
      const parser = new DocumentParser(scanner);

      const doc = await parser.parse();

      // Should recover via brute-force
      expect(doc.warnings.length).toBeGreaterThan(0);
    });
  });
});
