/**
 * PDF numeric object (integer or real).
 *
 * In PDF: `42`, `-3.14`, `0.5`
 */
export class PdfNumber {
  get type(): "number" {
    return "number";
  }

  constructor(readonly value: number) {}

  /**
   * Returns true if this number is an integer (no fractional part).
   */
  isInteger(): boolean {
    return Number.isInteger(this.value);
  }

  static of(value: number): PdfNumber {
    return new PdfNumber(value);
  }
}
