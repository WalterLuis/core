/**
 * FontEmbedder - Creates PDF objects for embedding fonts.
 *
 * Generates the complete PDF structure for an embedded font:
 * - Type0 (composite font) dictionary
 * - CIDFont dictionary (CIDFontType2)
 * - FontDescriptor dictionary
 * - Font file stream (subsetted TTF)
 * - ToUnicode CMap stream
 */

import { CFFSubsetter } from "#src/fontbox/cff/subsetter.ts";
import { TTFSubsetter } from "#src/fontbox/ttf/subsetter.ts";
import { PdfArray } from "#src/objects/pdf-array.ts";
import { PdfDict } from "#src/objects/pdf-dict.ts";
import { PdfName } from "#src/objects/pdf-name.ts";
import { PdfNumber } from "#src/objects/pdf-number.ts";
import type { PdfRef } from "#src/objects/pdf-ref.ts";
import { PdfStream } from "#src/objects/pdf-stream.ts";
import { PdfString } from "#src/objects/pdf-string.ts";
import type { EmbeddedFont } from "./embedded-font.ts";
import type {
  CFFCIDFontProgram,
  CFFType1FontProgram,
  FontProgram,
  TrueTypeFontProgram,
} from "./font-program/index.ts";
import { buildToUnicodeCMap } from "./to-unicode-builder.ts";
import { buildWidthsArray, serializeWidthsArray } from "./widths-builder.ts";

/**
 * Result of font embedding - all PDF objects that need to be registered.
 */
export interface FontEmbedResult {
  /** The main Type0 font dictionary (reference this from page resources) */
  type0Dict: PdfDict;

  /** The CIDFont dictionary */
  cidFontDict: PdfDict;

  /** The FontDescriptor dictionary */
  descriptorDict: PdfDict;

  /** The font file stream (subsetted font data) */
  fontStream: PdfStream;

  /** The ToUnicode CMap stream */
  toUnicodeStream: PdfStream;

  /** Key to use for font file reference in FontDescriptor (FontFile2 for TTF, FontFile3 for CFF) */
  fontFileKey: "FontFile2" | "FontFile3";
}

/**
 * Options for embedding.
 */
export interface EmbedOptions {
  /** Subset tag (6 uppercase letters). If not provided, a random one is generated. */
  subsetTag?: string;
}

/**
 * Generate a random 6-character subset tag (uppercase letters).
 */
export function generateSubsetTag(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let tag = "";

  for (let i = 0; i < 6; i++) {
    tag += chars[Math.floor(Math.random() * chars.length)];
  }

  return tag;
}

/**
 * Create PDF objects for embedding a font.
 *
 * This function takes an EmbeddedFont that has been used to encode text
 * (tracking glyph usage) and creates all the PDF objects needed to embed it.
 *
 * @param font - The EmbeddedFont with tracked glyph usage
 * @param options - Embedding options
 * @returns All PDF objects that need to be registered
 */
export async function createFontObjects(
  font: EmbeddedFont,
  options: EmbedOptions = {},
): Promise<FontEmbedResult> {
  const program = font.program;

  // Generate or use provided subset tag
  const subsetTag = options.subsetTag ?? generateSubsetTag();
  font.setSubsetTag(subsetTag);

  const fontName = `${subsetTag}+${program.postScriptName ?? "Unknown"}`;

  // Get the used code points and their glyph IDs
  const codePointToGid = font.getCodePointToGidMap();

  // 1. Subset the font
  const subsetResult = await subsetFont(program, font.getUsedGlyphIds());

  // 2. Build ToUnicode CMap
  const toUnicodeData = buildToUnicodeCMap(codePointToGid);

  // 3. Build /W widths array
  const widthsEntries = buildWidthsArray(codePointToGid, program);
  const widthsArrayStr = serializeWidthsArray(widthsEntries);

  // 4. Create font stream
  const fontStreamDict = new PdfDict();

  if (subsetResult.fontFileKey === "FontFile2") {
    // TrueType: Length1 = uncompressed length
    fontStreamDict.set("Length1", PdfNumber.of(subsetResult.data.length));
  } else if (subsetResult.fontFileSubtype) {
    // CFF: Subtype indicates format
    fontStreamDict.set("Subtype", PdfName.of(subsetResult.fontFileSubtype));
  }

  const fontStream = new PdfStream(fontStreamDict, subsetResult.data);

  // 5. Create ToUnicode stream
  const toUnicodeStream = new PdfStream(new PdfDict(), toUnicodeData);

  // 6. Create FontDescriptor
  const descriptorDict = createFontDescriptor(fontName, program);

  // 7. Create CIDFont dictionary
  const cidFontSubtype = subsetResult.fontFileKey === "FontFile2" ? "CIDFontType2" : "CIDFontType0";
  const cidFontDict = createCIDFontDict(fontName, widthsArrayStr, cidFontSubtype);

  // 8. Create Type0 dictionary
  const type0Dict = createType0Dict(fontName);

  return {
    type0Dict,
    cidFontDict,
    descriptorDict,
    fontStream,
    toUnicodeStream,
    fontFileKey: subsetResult.fontFileKey,
  };
}

/**
 * Register all font objects with the PDF and link them together.
 *
 * @param result - The font embedding result
 * @param register - Function to register objects (from PDF.register)
 * @returns The reference to the Type0 font dictionary
 */
export function registerFontObjects(
  result: FontEmbedResult,
  register: (obj: PdfDict | PdfStream) => PdfRef,
): PdfRef {
  // Register in dependency order (bottom-up)

  // 1. Font stream
  const fontStreamRef = register(result.fontStream);

  // 2. ToUnicode stream
  const toUnicodeRef = register(result.toUnicodeStream);

  // 3. FontDescriptor (references font stream)
  // Use FontFile2 for TrueType, FontFile3 for CFF
  result.descriptorDict.set(result.fontFileKey, fontStreamRef);
  const descriptorRef = register(result.descriptorDict);

  // 4. CIDFont (references descriptor)
  result.cidFontDict.set("FontDescriptor", descriptorRef);
  const cidFontRef = register(result.cidFontDict);

  // 5. Type0 font (references CIDFont and ToUnicode)
  result.type0Dict.set("DescendantFonts", new PdfArray([cidFontRef]));
  result.type0Dict.set("ToUnicode", toUnicodeRef);
  const type0Ref = register(result.type0Dict);

  return type0Ref;
}

/**
 * Result of font subsetting.
 */
interface SubsetResult {
  data: Uint8Array;
  /** Font file key: FontFile2 for TTF, FontFile3 for CFF */
  fontFileKey: "FontFile2" | "FontFile3";
  /** Subtype for FontFile3 (CIDFontType0C) */
  fontFileSubtype?: string;
}

/**
 * Subset the font to only include the used glyphs.
 */
async function subsetFont(program: FontProgram, usedGlyphIds: number[]): Promise<SubsetResult> {
  // CFF fonts (standalone or OTF with CFF outlines)
  if (program.type === "cff" || program.type === "cff-cid") {
    const cffProgram = program as CFFType1FontProgram | CFFCIDFontProgram;
    const subsetter = new CFFSubsetter(cffProgram.font);

    for (const gid of usedGlyphIds) {
      subsetter.addGlyph(gid);
    }

    return {
      data: subsetter.write(),
      fontFileKey: "FontFile3",
      fontFileSubtype: "CIDFontType0C",
    };
  }

  // TrueType fonts
  if (program.type === "truetype") {
    const ttf = (program as TrueTypeFontProgram).font;

    // Check if the font has a glyf table (CFF-based OTF fonts don't have one)
    if (!ttf.getTableBytes("glyf")) {
      // This is an OTF font with CFF outlines - need CFF subsetter
      // But we parsed it as TrueType, so we don't have the CFF data easily
      // Return the original font data for now
      return {
        data: program.getData(),
        fontFileKey: "FontFile3",
        fontFileSubtype: "OpenType",
      };
    }

    // Create TTF subsetter
    const subsetter = new TTFSubsetter(ttf);

    // Since we track code points, add them using the font's cmap
    const cmap = ttf.cmap?.getUnicodeCmap();

    if (cmap) {
      // Find code points for each GID we need
      // This is a reverse lookup - expensive but correct
      for (const gid of usedGlyphIds) {
        // .notdef is always included
        if (gid === 0) {
          continue;
        }

        // Search for a code point that maps to this GID
        // This is inefficient but works for now
        // TODO: Build a reverse map
        for (let cp = 0; cp < 0x10000; cp++) {
          if (cmap.getGlyphId(cp) === gid) {
            subsetter.add(cp);

            break;
          }
        }
      }
    }

    return {
      data: await subsetter.write(),
      fontFileKey: "FontFile2",
    };
  }

  // Type1 fonts - no subsetting implemented yet
  return {
    data: program.getData(),
    fontFileKey: "FontFile3",
    fontFileSubtype: "Type1C",
  };
}

/**
 * Create the FontDescriptor dictionary.
 *
 * Note: FontFile2/FontFile3 is set during registration, not here.
 */
function createFontDescriptor(fontName: string, program: FontProgram): PdfDict {
  const scale = 1000 / program.unitsPerEm;
  const bbox = program.bbox;

  return PdfDict.of({
    Type: PdfName.of("FontDescriptor"),
    FontName: PdfName.of(fontName),
    Flags: PdfNumber.of(computeFlags(program)),
    FontBBox: new PdfArray([
      PdfNumber.of(Math.round(bbox[0] * scale)),
      PdfNumber.of(Math.round(bbox[1] * scale)),
      PdfNumber.of(Math.round(bbox[2] * scale)),
      PdfNumber.of(Math.round(bbox[3] * scale)),
    ]),
    ItalicAngle: PdfNumber.of(program.italicAngle),
    Ascent: PdfNumber.of(Math.round(program.ascent * scale)),
    Descent: PdfNumber.of(Math.round(program.descent * scale)),
    CapHeight: PdfNumber.of(Math.round(program.capHeight * scale)),
    StemV: PdfNumber.of(program.stemV),
    // FontFile2 or FontFile3 will be set when registering
  });
}

/**
 * Create the CIDFont dictionary.
 */
function createCIDFontDict(
  fontName: string,
  widthsArrayStr: string,
  subtype: "CIDFontType0" | "CIDFontType2" = "CIDFontType2",
): PdfDict {
  const dict = PdfDict.of({
    Type: PdfName.of("Font"),
    Subtype: PdfName.of(subtype),
    BaseFont: PdfName.of(fontName),
    CIDSystemInfo: PdfDict.of({
      Registry: PdfString.fromString("Adobe"),
      Ordering: PdfString.fromString("Identity"),
      Supplement: PdfNumber.of(0),
    }),
    // FontDescriptor will be set when registering
  });

  // CIDToGIDMap only applies to CIDFontType2 (TrueType-based)
  if (subtype === "CIDFontType2") {
    dict.set("CIDToGIDMap", PdfName.of("Identity"));
  }

  // Parse and set the /W array
  // The widthsArrayStr is already in PDF array syntax
  // For now, we'll create the array manually
  dict.set("W", parseWidthsArray(widthsArrayStr));

  return dict;
}

/**
 * Create the Type0 font dictionary.
 */
function createType0Dict(fontName: string): PdfDict {
  return PdfDict.of({
    Type: PdfName.of("Font"),
    Subtype: PdfName.of("Type0"),
    BaseFont: PdfName.of(fontName),
    Encoding: PdfName.of("Identity-H"),
    // DescendantFonts and ToUnicode will be set when registering
  });
}

/**
 * Compute font flags for the descriptor.
 */
function computeFlags(program: FontProgram): number {
  let flags = 0;

  // Flag 1: FixedPitch
  if (program.isFixedPitch) {
    flags |= 1 << 0;
  }

  // Flag 3: Symbolic (use if not Latin)
  // For embedded fonts, mark as symbolic (safer)
  flags |= 1 << 2;

  // Flag 7: Italic
  if (program.italicAngle !== 0) {
    flags |= 1 << 6;
  }

  return flags;
}

/**
 * Parse a widths array string into a PdfArray.
 *
 * Format: [ CID [w1 w2 w3] CID CID w ... ]
 */
function parseWidthsArray(str: string): PdfArray {
  const result: (PdfNumber | PdfArray)[] = [];

  // Simple tokenizer
  const tokens: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of str) {
    if (char === "[") {
      if (depth > 0) {
        current += char;
      }
      depth++;
    } else if (char === "]") {
      depth--;
      if (depth > 0) {
        current += char;
      } else if (depth === 0 && current.trim()) {
        tokens.push(`[${current.trim()}]`);
        current = "";
      }
    } else if (char === " " || char === "\n" || char === "\t") {
      if (depth > 0) {
        current += char;
      } else if (current.trim()) {
        tokens.push(current.trim());
        current = "";
      }
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    tokens.push(current.trim());
  }

  // Parse tokens
  for (const token of tokens) {
    if (token.startsWith("[") && token.endsWith("]")) {
      // Nested array of widths
      const inner = token.slice(1, -1).trim();
      const widths = inner.split(/\s+/).map(w => PdfNumber.of(Number.parseInt(w, 10)));
      result.push(new PdfArray(widths));
    } else {
      // CID or width number
      result.push(PdfNumber.of(Number.parseInt(token, 10)));
    }
  }

  return new PdfArray(result);
}
