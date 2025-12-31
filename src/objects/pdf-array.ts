import type { PdfObject } from "./object";

/**
 * PDF array object (mutable).
 *
 * In PDF: `[1 2 3]`, `[/Name (string) 42]`
 *
 * Supports an optional mutation hook for change tracking.
 */
export class PdfArray {
  get type(): "array" {
    return "array";
  }

  private items: PdfObject[] = [];
  private onMutate?: () => void;

  constructor(items?: PdfObject[]) {
    if (items) {
      this.items = [...items];
    }
  }

  /**
   * Set a callback to be invoked whenever the array is mutated.
   * Used by the document layer for dirty tracking.
   */
  setMutationHandler(handler: () => void): void {
    this.onMutate = handler;
  }

  private notifyMutation(): void {
    this.onMutate?.();
  }

  get length(): number {
    return this.items.length;
  }

  /**
   * Get item at index. Returns undefined if out of bounds.
   */
  at(index: number): PdfObject | undefined {
    return this.items.at(index);
  }

  /**
   * Set item at index. Extends array if needed.
   */
  set(index: number, value: PdfObject): void {
    this.items[index] = value;
    this.notifyMutation();
  }

  push(...values: PdfObject[]): void {
    this.items.push(...values);
    this.notifyMutation();
  }

  pop(): PdfObject | undefined {
    const value = this.items.pop();
    if (value !== undefined) {
      this.notifyMutation();
    }
    return value;
  }

  /**
   * Remove item at index, shifting subsequent items.
   */
  remove(index: number): void {
    this.items.splice(index, 1);
    this.notifyMutation();
  }

  /**
   * Iterate over items.
   */
  *[Symbol.iterator](): Iterator<PdfObject> {
    yield* this.items;
  }

  /**
   * Get all items as a new array.
   */
  toArray(): PdfObject[] {
    return [...this.items];
  }

  /**
   * Create array from items.
   */
  static of(...items: PdfObject[]): PdfArray {
    return new PdfArray(items);
  }
}
