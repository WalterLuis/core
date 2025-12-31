/**
 * PDF name object (interned).
 *
 * In PDF: `/Type`, `/Page`, `/Length`
 *
 * Names are interned — `PdfName.of("Type") === PdfName.of("Type")`.
 * Use `.of()` to get or create instances.
 */
export class PdfName {
  get type(): "name" {
    return "name";
  }

  private static cache = new Map<string, PdfName>();

  private constructor(readonly value: string) {}

  /**
   * Get or create an interned PdfName for the given string.
   * The leading `/` should NOT be included.
   */
  static of(name: string): PdfName {
    let cached = PdfName.cache.get(name);

    if (!cached) {
      cached = new PdfName(name);

      PdfName.cache.set(name, cached);
    }

    return cached;
  }

  // Common PDF names (pre-cached)
  static readonly Type = PdfName.of("Type");
  static readonly Page = PdfName.of("Page");
  static readonly Pages = PdfName.of("Pages");
  static readonly Catalog = PdfName.of("Catalog");
  static readonly Count = PdfName.of("Count");
  static readonly Kids = PdfName.of("Kids");
  static readonly Parent = PdfName.of("Parent");
  static readonly MediaBox = PdfName.of("MediaBox");
  static readonly Resources = PdfName.of("Resources");
  static readonly Contents = PdfName.of("Contents");
  static readonly Length = PdfName.of("Length");
  static readonly Filter = PdfName.of("Filter");
  static readonly FlateDecode = PdfName.of("FlateDecode");
}
