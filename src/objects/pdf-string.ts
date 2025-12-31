/**
 * PDF string object.
 *
 * In PDF: `(Hello World)` (literal) or `<48656C6C6F>` (hex)
 *
 * Stores raw bytes — decode with `.asString()` when needed.
 */
export class PdfString {
  get type(): "string" {
    return "string";
  }

  constructor(
    readonly bytes: Uint8Array,
    readonly format: "literal" | "hex" = "literal",
  ) {}

  /**
   * Decode bytes as a string.
   * Uses UTF-8 by default. For proper PDF text decoding,
   * higher-level code should check for BOM and use appropriate encoding.
   */
  asString(): string {
    return new TextDecoder("utf-8").decode(this.bytes);
  }

  /**
   * Create a PdfString from a JavaScript string (encodes as UTF-8).
   */
  static fromString(str: string): PdfString {
    const bytes = new TextEncoder().encode(str);
    return new PdfString(bytes, "literal");
  }

  /**
   * Create a PdfString from a hex string (e.g., "48656C6C6F").
   * Whitespace is ignored. Odd-length strings are padded with 0.
   */
  static fromHex(hex: string): PdfString {
    // Remove whitespace
    const clean = hex.replace(/\s/g, "");

    // Pad odd-length with trailing 0
    const padded = clean.length % 2 === 1 ? `${clean}0` : clean;

    const bytes = new Uint8Array(padded.length / 2);
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(padded.slice(i * 2, i * 2 + 2), 16);
    }

    return new PdfString(bytes, "hex");
  }
}
