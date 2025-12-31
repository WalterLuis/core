import type { PdfObject } from "./object";
import { PdfDict } from "./pdf-dict";
import type { PdfName } from "./pdf-name";

/**
 * PDF stream object (dictionary + binary data).
 *
 * In PDF:
 * ```
 * << /Length 5 /Filter /FlateDecode >>
 * stream
 * ...binary data...
 * endstream
 * ```
 *
 * Extends PdfDict with attached data.
 */
export class PdfStream extends PdfDict {
  override get type(): "stream" {
    return "stream";
  }

  private _data: Uint8Array;

  constructor(
    dict?: PdfDict | Iterable<[PdfName | string, PdfObject]>,
    data: Uint8Array = new Uint8Array(0),
  ) {
    if (dict instanceof PdfDict) {
      // Copy entries from existing dict
      super(dict);
    } else {
      super(dict);
    }

    this._data = data;
  }

  /**
   * The raw (possibly compressed) stream data.
   */
  get data(): Uint8Array {
    return this._data;
  }

  /**
   * Set new stream data.
   */
  set data(value: Uint8Array) {
    this._data = value;
    this.notifyMutation();
  }

  /**
   * Create stream from dict entries and data.
   */
  static fromDict(
    entries: Record<string, PdfObject>,
    data: Uint8Array = new Uint8Array(0),
  ): PdfStream {
    return new PdfStream(Object.entries(entries), data);
  }
}
