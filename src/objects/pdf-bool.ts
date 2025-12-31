/**
 * PDF boolean object.
 *
 * In PDF: `true` or `false`
 *
 * Use `PdfBool.of(value)` to get cached instances.
 */
export class PdfBool {
  static readonly TRUE = new PdfBool(true);
  static readonly FALSE = new PdfBool(false);

  private constructor(readonly value: boolean) {}

  get type(): "bool" {
    return "bool";
  }

  static of(value: boolean): PdfBool {
    return value ? PdfBool.TRUE : PdfBool.FALSE;
  }
}
