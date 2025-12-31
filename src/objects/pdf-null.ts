/**
 * PDF null object - a singleton representing the null value.
 *
 * In PDF: `null`
 */
export class PdfNull {
  static readonly instance = new PdfNull();

  get type(): "null" {
    return "null";
  }

  private constructor() {}
}
