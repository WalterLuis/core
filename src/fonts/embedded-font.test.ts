import { describe, expect, it } from "vitest";
import { loadFixture } from "#src/test-utils";
import { EmbeddedFont } from "./embedded-font";
import { parseFontProgram } from "./embedded-parser";
import { buildToUnicodeCMap } from "./to-unicode-builder";
import { buildWidthsArray, optimizeWidthsArray, serializeWidthsArray } from "./widths-builder";

describe("EmbeddedFont", () => {
  it("should create from TTF bytes", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    expect(font.subtype).toBe("Type0");
    expect(font.baseFontName).toBeTruthy();
  });

  it("should encode text and track glyph usage", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    const codes = font.encodeText("Hello");

    // Identity-H: codes are Unicode code points
    expect(codes).toEqual([72, 101, 108, 108, 111]); // H, e, l, l, o

    // Glyphs should be tracked
    const usedGlyphs = font.getUsedGlyphIds();
    expect(usedGlyphs.length).toBeGreaterThan(1); // At least .notdef + used glyphs
  });

  it("should check if text can be encoded", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    // ASCII should be encodable
    expect(font.canEncode("Hello World")).toBe(true);

    // Private use area characters likely not in font
    expect(font.canEncode("\uE000")).toBe(false);
  });

  it("should calculate text width", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    const width = font.getTextWidth("Hello", 12);
    expect(width).toBeGreaterThan(0);
    expect(typeof width).toBe("number");
  });

  it("should get width for individual characters", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    // 'A' = code point 65
    const widthA = font.getWidth(65);
    expect(widthA).toBeGreaterThan(0);

    // Space = code point 32
    const widthSpace = font.getWidth(32);
    expect(widthSpace).toBeGreaterThan(0);
    expect(widthSpace).toBeLessThan(widthA); // Space is narrower than A
  });

  it("should decode to Unicode", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    // For Identity-H, toUnicode just returns the code point as string
    expect(font.toUnicode(65)).toBe("A");
    expect(font.toUnicode(0x4e2d)).toBe("中"); // Chinese character
  });

  it("should build descriptor from font metrics", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    const descriptor = font.descriptor;
    expect(descriptor).not.toBeNull();
    expect(descriptor?.ascent).toBeGreaterThan(0);
    expect(descriptor?.descent).toBeLessThan(0); // Descent is negative
    expect(descriptor?.fontBBox).toHaveLength(4);
  });

  it("should reset usage tracking", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    font.encodeText("Hello");
    expect(font.getUsedGlyphIds().length).toBeGreaterThan(1);

    font.resetUsage();
    // Only .notdef should remain
    expect(font.getUsedGlyphIds()).toEqual([0]);
  });

  it("should get unencodable characters", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const font = EmbeddedFont.fromBytes(fontBytes);

    // Mix of encodable and unencodable
    const unencodable = font.getUnencodableCharacters("Hello\uE000World");
    expect(unencodable).toContain("\uE000");
    expect(unencodable).not.toContain("H");
  });
});

describe("parseFontProgram", () => {
  it("should parse TTF font", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const program = parseFontProgram(fontBytes);

    expect(program.type).toBe("truetype");
    expect(program.numGlyphs).toBeGreaterThan(0);
    expect(program.unitsPerEm).toBeGreaterThan(0);
  });

  it("should parse OTF font", async () => {
    const fontBytes = await loadFixture("fonts", "otf/FoglihtenNo07.otf");
    const program = parseFontProgram(fontBytes);

    // OTF fonts can have either TrueType or CFF outlines
    expect(["truetype", "cff", "cff-cid"]).toContain(program.type);
    expect(program.numGlyphs).toBeGreaterThan(0);
  });

  it("should reject invalid data", () => {
    const invalidData = new Uint8Array([0, 0, 0, 0]);
    expect(() => parseFontProgram(invalidData)).toThrow();
  });
});

describe("ToUnicode CMap Builder", () => {
  it("should build ToUnicode CMap from code points", () => {
    const codePoints = new Map([
      [65, 100], // A -> GID 100
      [66, 101], // B -> GID 101
      [67, 102], // C -> GID 102
    ]);

    const cmap = buildToUnicodeCMap(codePoints);
    const text = new TextDecoder().decode(cmap);

    expect(text).toContain("begincodespacerange");
    expect(text).toContain("beginbfchar");
    expect(text).toContain("<0041>"); // Hex for 'A' (65)
    expect(text).toContain("endcmap");
  });

  it("should handle empty mapping", () => {
    const cmap = buildToUnicodeCMap(new Map());
    const text = new TextDecoder().decode(cmap);

    expect(text).toContain("begincmap");
    expect(text).toContain("endcmap");
    expect(text).not.toContain("beginbfchar");
  });

  it("should handle characters outside BMP", () => {
    const codePoints = new Map([
      [0x1f600, 500], // Emoji: grinning face
    ]);

    const cmap = buildToUnicodeCMap(codePoints);
    const text = new TextDecoder().decode(cmap);

    // Should have surrogate pair representation
    expect(text).toContain("<D83D"); // High surrogate
  });
});

describe("Widths Array Builder", () => {
  it("should build widths array from used code points", async () => {
    const fontBytes = await loadFixture("fonts", "ttf/LiberationSans-Regular.ttf");
    const program = parseFontProgram(fontBytes);

    const usedCodePoints = new Map([
      [65, program.getGlyphId(65)], // A
      [66, program.getGlyphId(66)], // B
      [67, program.getGlyphId(67)], // C
    ]);

    const entries = buildWidthsArray(usedCodePoints, program);

    expect(entries.length).toBeGreaterThan(0);
    // Should have individual widths since widths likely differ
  });

  it("should optimize consecutive CIDs with same width", () => {
    const widths = new Map([
      [100, 500],
      [101, 500],
      [102, 500],
      [103, 500],
    ]);

    const entries = optimizeWidthsArray(widths);

    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("range");
    if (entries[0].type === "range") {
      expect(entries[0].startCid).toBe(100);
      expect(entries[0].endCid).toBe(103);
      expect(entries[0].width).toBe(500);
    }
  });

  it("should use individual format for different widths", () => {
    const widths = new Map([
      [100, 500],
      [101, 600],
      [102, 700],
    ]);

    const entries = optimizeWidthsArray(widths);

    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("individual");
    if (entries[0].type === "individual") {
      expect(entries[0].widths).toEqual([500, 600, 700]);
    }
  });

  it("should handle gaps in CIDs", () => {
    const widths = new Map([
      [100, 500],
      [101, 500],
      [200, 600], // Gap
      [201, 600],
    ]);

    const entries = optimizeWidthsArray(widths);

    // Should produce two entries (one for each group)
    expect(entries.length).toBe(2);
  });

  it("should serialize widths array correctly", () => {
    const entries = optimizeWidthsArray(
      new Map([
        [1, 500],
        [2, 600],
        [3, 700],
        [100, 400],
        [101, 400],
        [102, 400],
      ]),
    );

    const serialized = serializeWidthsArray(entries);

    expect(serialized).toContain("[");
    expect(serialized).toContain("]");
    // Should contain both individual and range formats
  });
});
