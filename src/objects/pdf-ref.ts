/**
 * PDF indirect reference (interned).
 *
 * In PDF: `1 0 R`, `42 0 R`
 *
 * References are interned — `PdfRef.of(1, 0) === PdfRef.of(1, 0)`.
 * Use `.of()` to get or create instances.
 */
export class PdfRef {
  get type(): "ref" {
    return "ref";
  }

  private static cache = new Map<string, PdfRef>();

  private constructor(
    readonly objectNumber: number,
    readonly generation: number,
  ) {}

  /**
   * Get or create an interned PdfRef for the given object/generation pair.
   */
  static of(objectNumber: number, generation: number = 0): PdfRef {
    const key = `${objectNumber} ${generation}`;

    let cached = PdfRef.cache.get(key);

    if (!cached) {
      cached = new PdfRef(objectNumber, generation);

      PdfRef.cache.set(key, cached);
    }

    return cached;
  }

  /**
   * Returns the PDF syntax representation: "1 0 R"
   */
  toString(): string {
    return `${this.objectNumber} ${this.generation} R`;
  }
}
