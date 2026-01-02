/**
 * EmbeddedFont - User-facing class for embedding fonts into PDFs.
 *
 * This class wraps a parsed font (via fontbox) and provides:
 * - Text encoding (Unicode to character codes)
 * - Width measurement
 * - Usage tracking for subsetting
 * - ToUnicode map generation
 */

import type { TrueTypeFont } from "#src/fontbox/ttf/truetype-font.ts";
import { parseFontProgram } from "./embedded-parser.ts";
import { FontDescriptor } from "./font-descriptor.ts";
import { type FontProgram, TrueTypeFontProgram } from "./font-program/index.ts";
import { PdfFont } from "./pdf-font.ts";

/**
 * Options for embedding a font.
 */
export interface EmbedFontOptions {
  /**
   * Variation axis values for variable fonts.
   * Keys are axis tags (e.g., 'wght', 'wdth'), values are axis values.
   * If not specified, uses the font's default values.
   */
  variations?: Record<string, number>;

  /**
   * Named instance to use for variable fonts.
   * If specified, overrides any variations.
   */
  instance?: string;
}

/**
 * EmbeddedFont represents a font that will be embedded into a PDF.
 *
 * Usage:
 * ```typescript
 * const fontBytes = await fs.readFile("NotoSans-Regular.ttf");
 * const font = EmbeddedFont.fromBytes(fontBytes);
 *
 * // Check if text can be encoded
 * if (font.canEncode("Hello ")) {
 *   const codes = font.encodeText("Hello ");
 *   const width = font.getTextWidth("Hello ", 12);
 * }
 * ```
 */
export class EmbeddedFont extends PdfFont {
  readonly subtype = "Type0" as const;

  /** Underlying font program */
  private readonly fontProgram: FontProgram;

  /** Original font data */
  private readonly fontData: Uint8Array;

  /** Track used glyphs for subsetting (GID -> code points that use it) */
  private readonly usedGlyphs: Map<number, Set<number>> = new Map([[0, new Set()]]); // Always include .notdef

  /** Track used code points for ToUnicode (codePoint -> GID) */
  private readonly usedCodePoints: Map<number, number> = new Map();

  /** Subset tag (generated during save) */
  private _subsetTag: string | null = null;

  /** Cached descriptor */
  private _descriptor: FontDescriptor | null = null;

  private constructor(fontProgram: FontProgram, fontData: Uint8Array) {
    super();

    this.fontProgram = fontProgram;
    this.fontData = fontData;
  }

  /**
   * Create an EmbeddedFont from raw font bytes.
   *
   * @param data - TTF, OTF, or Type1 font data
   * @param options - Embedding options
   * @returns EmbeddedFont instance
   * @throws Error if font format is not recognized
   */
  static fromBytes(data: Uint8Array, _options?: EmbedFontOptions): EmbeddedFont {
    const program = parseFontProgram(data);

    // TODO: Handle variable font options (flatten to static instance)
    return new EmbeddedFont(program, data);
  }

  /**
   * Create an EmbeddedFont from an already-parsed TrueType font.
   */
  static fromTrueTypeFont(font: TrueTypeFont, data: Uint8Array): EmbeddedFont {
    const program = new TrueTypeFontProgram(font, data);

    return new EmbeddedFont(program, data);
  }

  /**
   * Get the base font name.
   * During save, this will include a subset tag prefix (e.g., "ABCDEF+FontName").
   */
  get baseFontName(): string {
    const name = this.fontProgram.postScriptName ?? "Unknown";

    return this._subsetTag ? `${this._subsetTag}+${name}` : name;
  }

  /**
   * Get the font descriptor.
   */
  get descriptor(): FontDescriptor | null {
    if (!this._descriptor) {
      this._descriptor = this.buildDescriptor();
    }

    return this._descriptor;
  }

  /**
   * Get the underlying font program.
   */
  get program(): FontProgram {
    return this.fontProgram;
  }

  /**
   * Get the original font data.
   */
  get data(): Uint8Array {
    return this.fontData;
  }

  /**
   * Get the subset tag (only available after save).
   */
  get subsetTag(): string | null {
    return this._subsetTag;
  }

  /**
   * Set the subset tag (called during save).
   */
  setSubsetTag(tag: string): void {
    this._subsetTag = tag;
  }

  /**
   * Get all used glyph IDs.
   */
  getUsedGlyphIds(): number[] {
    return [...this.usedGlyphs.keys()].sort((a, b) => a - b);
  }

  /**
   * Get mapping from code point to GID.
   */
  getCodePointToGidMap(): Map<number, number> {
    return new Map(this.usedCodePoints);
  }

  /**
   * Encode text to character codes.
   * Uses Identity-H encoding (code = Unicode code point).
   *
   * Also tracks glyph usage for subsetting.
   */
  encodeText(text: string): number[] {
    const codes: number[] = [];

    for (const char of text) {
      const codePoint = char.codePointAt(0);

      if (codePoint === undefined) {
        continue;
      }

      const gid = this.fontProgram.getGlyphId(codePoint);

      // Track usage for subsetting
      if (!this.usedGlyphs.has(gid)) {
        this.usedGlyphs.set(gid, new Set());
      }

      // biome-ignore lint/style/noNonNullAssertion: set(...) above if not has(...)
      this.usedGlyphs.get(gid)!.add(codePoint);
      this.usedCodePoints.set(codePoint, gid);

      // Identity-H: code = code point
      codes.push(codePoint);
    }

    return codes;
  }

  /**
   * Get width of a character code in glyph units (1000 = 1 em).
   *
   * For Identity-H encoding, the code is the Unicode code point.
   */
  getWidth(code: number): number {
    const gid = this.fontProgram.getGlyphId(code);
    const width = this.fontProgram.getAdvanceWidth(gid);

    return Math.round((width * 1000) / this.fontProgram.unitsPerEm);
  }

  /**
   * Decode character code to Unicode string.
   * For Identity-H encoding, the code is the Unicode code point.
   */
  toUnicode(code: number): string {
    return String.fromCodePoint(code);
  }

  /**
   * Check if the font can encode the given text.
   * Returns true if all characters have glyphs in the font.
   */
  canEncode(text: string): boolean {
    for (const char of text) {
      const codePoint = char.codePointAt(0);

      if (codePoint === undefined) {
        continue;
      }

      if (!this.fontProgram.hasGlyph(codePoint)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the characters that cannot be encoded.
   */
  getUnencodableCharacters(text: string): string[] {
    const unencodable: string[] = [];

    for (const char of text) {
      const codePoint = char.codePointAt(0);

      if (codePoint === undefined) {
        continue;
      }

      if (!this.fontProgram.hasGlyph(codePoint)) {
        unencodable.push(char);
      }
    }

    return unencodable;
  }

  /**
   * Reset glyph usage tracking.
   * Call this before re-encoding if you want a fresh subset.
   */
  resetUsage(): void {
    this.usedGlyphs.clear();
    this.usedGlyphs.set(0, new Set()); // Always include .notdef
    this.usedCodePoints.clear();

    this._subsetTag = null;
  }

  /**
   * Build a FontDescriptor from the font program.
   */
  private buildDescriptor(): FontDescriptor {
    const program = this.fontProgram;
    const bbox = program.bbox;

    // Scale metrics to 1000 units per em
    const scale = 1000 / program.unitsPerEm;

    return new FontDescriptor({
      fontName: program.postScriptName ?? "Unknown",
      flags: this.computeFlags(),
      fontBBox: [
        Math.round(bbox[0] * scale),
        Math.round(bbox[1] * scale),
        Math.round(bbox[2] * scale),
        Math.round(bbox[3] * scale),
      ],
      italicAngle: program.italicAngle,
      ascent: Math.round(program.ascent * scale),
      descent: Math.round(program.descent * scale),
      leading: 0,
      capHeight: Math.round(program.capHeight * scale),
      xHeight: Math.round(program.xHeight * scale),
      stemV: program.stemV,
      stemH: 0,
      avgWidth: 0,
      maxWidth: 0,
      missingWidth: this.getWidth(0), // Width of .notdef
    });
  }

  /**
   * Compute font flags for the descriptor.
   */
  private computeFlags(): number {
    let flags = 0;

    // Flag 1: FixedPitch
    if (this.fontProgram.isFixedPitch) {
      flags |= 1 << 0;
    }

    // Flag 3: Symbolic (use if not Latin)
    // For now, assume symbolic for all embedded fonts (safer)
    flags |= 1 << 2;

    // Flag 7: Italic
    if (this.fontProgram.italicAngle !== 0) {
      flags |= 1 << 6;
    }

    return flags;
  }
}
