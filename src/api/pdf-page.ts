/**
 * PDFPage - High-level wrapper for a PDF page.
 *
 * Provides convenient access to page properties and operations.
 * Obtained via `pdf.getPage(index)` or `pdf.getPages()`.
 *
 * @example
 * ```typescript
 * const pdf = await PDF.load(bytes);
 * const page = pdf.getPage(0);
 *
 * // Access page properties
 * console.log(`Size: ${page.width} x ${page.height}`);
 * console.log(`Rotation: ${page.rotation}`);
 *
 * // Get underlying objects for low-level access
 * const ref = page.ref;
 * const dict = page.dict;
 * ```
 */

import { PdfArray } from "#src/objects/pdf-array";
import { PdfDict } from "#src/objects/pdf-dict";
import { PdfNumber } from "#src/objects/pdf-number";
import { PdfRef } from "#src/objects/pdf-ref";
import { PdfStream } from "#src/objects/pdf-stream";
import type { PDFContext } from "./pdf-context";
import type { PDFEmbeddedPage } from "./pdf-embedded-page";

/**
 * A rectangle defined by [x1, y1, x2, y2] coordinates.
 */
export interface Rectangle {
  /** Left x coordinate */
  x1: number;
  /** Bottom y coordinate */
  y1: number;
  /** Right x coordinate */
  x2: number;
  /** Top y coordinate */
  y2: number;
}

/**
 * Options for drawing an embedded page.
 */
export interface DrawPageOptions {
  /** X position from left edge (default: 0) */
  x?: number;
  /** Y position from bottom edge (default: 0) */
  y?: number;
  /** Uniform scale factor (default: 1.0) */
  scale?: number;
  /** Target width in points (overrides scale) */
  width?: number;
  /** Target height in points (overrides scale) */
  height?: number;
  /** Opacity 0-1 (default: 1.0, fully opaque) */
  opacity?: number;
  /** Draw as background behind existing content (default: false = foreground) */
  background?: boolean;
}

/**
 * PDFPage wraps a page dictionary with convenient accessors.
 */
export class PDFPage {
  /** The page reference */
  readonly ref: PdfRef;

  /** The page dictionary */
  readonly dict: PdfDict;

  /** The page index (0-based) */
  readonly index: number;

  /** Document context for registering objects */
  private readonly ctx?: PDFContext;

  constructor(ref: PdfRef, dict: PdfDict, index: number, ctx?: PDFContext) {
    this.ref = ref;
    this.dict = dict;
    this.index = index;
    this.ctx = ctx;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Page Dimensions
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the MediaBox (page boundary).
   *
   * Returns the effective MediaBox, accounting for inheritance from parent pages.
   * If no MediaBox is found, returns a default US Letter size.
   */
  getMediaBox(): Rectangle {
    return this.getBox("MediaBox") ?? { x1: 0, y1: 0, x2: 612, y2: 792 };
  }

  /**
   * Get the CropBox (visible region).
   *
   * Falls back to MediaBox if CropBox is not defined.
   */
  getCropBox(): Rectangle {
    return this.getBox("CropBox") ?? this.getMediaBox();
  }

  /**
   * Get the BleedBox (printing bleed area).
   *
   * Falls back to CropBox if BleedBox is not defined.
   */
  getBleedBox(): Rectangle {
    return this.getBox("BleedBox") ?? this.getCropBox();
  }

  /**
   * Get the TrimBox (intended page dimensions after trimming).
   *
   * Falls back to CropBox if TrimBox is not defined.
   */
  getTrimBox(): Rectangle {
    return this.getBox("TrimBox") ?? this.getCropBox();
  }

  /**
   * Get the ArtBox (meaningful content area).
   *
   * Falls back to CropBox if ArtBox is not defined.
   */
  getArtBox(): Rectangle {
    return this.getBox("ArtBox") ?? this.getCropBox();
  }

  /**
   * Page width in points (based on MediaBox).
   *
   * Accounts for page rotation - if rotated 90 or 270 degrees,
   * returns the height of the MediaBox instead.
   */
  get width(): number {
    const box = this.getMediaBox();
    const rotation = this.rotation;

    if (rotation === 90 || rotation === 270) {
      return Math.abs(box.y2 - box.y1);
    }

    return Math.abs(box.x2 - box.x1);
  }

  /**
   * Page height in points (based on MediaBox).
   *
   * Accounts for page rotation - if rotated 90 or 270 degrees,
   * returns the width of the MediaBox instead.
   */
  get height(): number {
    const box = this.getMediaBox();
    const rotation = this.rotation;

    if (rotation === 90 || rotation === 270) {
      return Math.abs(box.x2 - box.x1);
    }

    return Math.abs(box.y2 - box.y1);
  }

  /**
   * Page rotation in degrees (0, 90, 180, or 270).
   */
  get rotation(): 0 | 90 | 180 | 270 {
    const rotate = this.dict.get("Rotate");

    if (rotate instanceof PdfNumber) {
      const value = rotate.value % 360;
      // Normalize to 0, 90, 180, 270

      if (value === 90 || value === -270) {
        return 90;
      }

      if (value === 180 || value === -180) {
        return 180;
      }

      if (value === 270 || value === -90) {
        return 270;
      }
    }

    return 0;
  }

  /**
   * Set the page rotation.
   *
   * @param degrees - Rotation in degrees (0, 90, 180, or 270)
   */
  setRotation(degrees: 0 | 90 | 180 | 270): void {
    if (degrees === 0) {
      this.dict.delete("Rotate");
    } else {
      this.dict.set("Rotate", PdfNumber.of(degrees));
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Resources
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the page's Resources dictionary.
   *
   * Creates an empty one if it doesn't exist.
   */
  getResources(): PdfDict {
    let resources = this.dict.get("Resources");

    if (!(resources instanceof PdfDict)) {
      resources = new PdfDict();

      this.dict.set("Resources", resources);
    }

    return resources;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Drawing
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Draw an embedded page onto this page.
   *
   * The embedded page (created via `pdf.embedPage()`) is drawn as a Form XObject.
   * By default, it's drawn in the foreground (on top of existing content).
   * Use `{ background: true }` to draw behind existing content.
   *
   * @param embedded The embedded page to draw
   * @param options Drawing options (position, scale, opacity, background)
   *
   * @example
   * ```typescript
   * // Draw a watermark centered on each page
   * const watermark = await pdf.embedPage(watermarkPdf, 0);
   *
   * for (const page of await pdf.getPages()) {
   *   page.drawPage(watermark, {
   *     x: (page.width - watermark.width) / 2,
   *     y: (page.height - watermark.height) / 2,
   *     opacity: 0.5,
   *   });
   * }
   *
   * // Draw as a background
   * page.drawPage(letterhead, { background: true });
   * ```
   */
  drawPage(embedded: PDFEmbeddedPage, options: DrawPageOptions = {}): void {
    const x = options.x ?? 0;
    const y = options.y ?? 0;

    // Calculate scale
    let scaleX = options.scale ?? 1;
    let scaleY = options.scale ?? 1;

    if (options.width !== undefined) {
      scaleX = options.width / embedded.width;
    }

    if (options.height !== undefined) {
      scaleY = options.height / embedded.height;
    }

    // If only width or height specified, maintain aspect ratio
    if (options.width !== undefined && options.height === undefined) {
      scaleY = scaleX;
    } else if (options.height !== undefined && options.width === undefined) {
      scaleX = scaleY;
    }

    // Add XObject to resources
    const xobjectName = this.addXObjectResource(embedded.ref);

    // Build content stream operators
    const ops: string[] = [];
    ops.push("q"); // Save graphics state

    // Set opacity if needed (via ExtGState)
    if (options.opacity !== undefined && options.opacity < 1) {
      const gsName = this.addGraphicsState({ ca: options.opacity, CA: options.opacity });
      ops.push(`/${gsName} gs`);
    }

    // Apply transformation matrix: [scaleX 0 0 scaleY x y]
    // Account for the embedded page's BBox origin
    const translateX = x - embedded.box.x1 * scaleX;
    const translateY = y - embedded.box.y1 * scaleY;
    ops.push(
      `${this.formatNumber(scaleX)} 0 0 ${this.formatNumber(scaleY)} ${this.formatNumber(translateX)} ${this.formatNumber(translateY)} cm`,
    );

    // Draw the XObject
    ops.push(`/${xobjectName} Do`);

    ops.push("Q"); // Restore graphics state

    const contentOps = ops.join("\n");

    if (options.background) {
      this.prependContent(contentOps);
    } else {
      this.appendContent(contentOps);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Internal Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Add an XObject reference to the page's resources.
   * Returns the name assigned to the XObject.
   */
  private addXObjectResource(ref: PdfRef): string {
    const resources = this.getResources();
    let xobjects = resources.get("XObject");

    if (!(xobjects instanceof PdfDict)) {
      xobjects = new PdfDict();
      resources.set("XObject", xobjects);
    }

    // Generate unique name
    const name = this.generateUniqueName(xobjects, "Fm");
    xobjects.set(name, ref);

    return name;
  }

  /**
   * Add a graphics state to the page's resources.
   * Returns the name assigned to the ExtGState.
   */
  private addGraphicsState(params: { ca?: number; CA?: number }): string {
    const resources = this.getResources();
    let extGState = resources.get("ExtGState");

    if (!(extGState instanceof PdfDict)) {
      extGState = new PdfDict();
      resources.set("ExtGState", extGState);
    }

    // Create the graphics state dict
    const gsDict = new PdfDict();

    if (params.ca !== undefined) {
      gsDict.set("ca", PdfNumber.of(params.ca)); // Stroke opacity
    }

    if (params.CA !== undefined) {
      gsDict.set("CA", PdfNumber.of(params.CA)); // Fill opacity
    }

    // Generate unique name
    const name = this.generateUniqueName(extGState, "GS");
    extGState.set(name, gsDict);

    return name;
  }

  /**
   * Generate a unique name not already in the dictionary.
   */
  private generateUniqueName(dict: PdfDict, prefix: string): string {
    let counter = 0;
    let name = `${prefix}${counter}`;

    while (dict.has(name)) {
      counter++;
      name = `${prefix}${counter}`;
    }

    return name;
  }

  /**
   * Format a number for PDF content stream (avoid unnecessary decimals).
   */
  private formatNumber(n: number): string {
    // Round to 4 decimal places to avoid floating point noise
    const rounded = Math.round(n * 10000) / 10000;

    // Use integer if possible
    if (Number.isInteger(rounded)) {
      return String(rounded);
    }

    return rounded.toString();
  }

  /**
   * Create and register a content stream.
   */
  private createContentStream(content: string): PdfRef | PdfStream {
    const bytes = new TextEncoder().encode(content);
    const stream = new PdfStream([], bytes);

    // If we have a context, register the stream and return a ref
    if (this.ctx) {
      return this.ctx.register(stream);
    }

    // Otherwise return the stream directly (for new pages not yet in a document)
    return stream;
  }

  /**
   * Prepend content to the page's content stream (for background drawing).
   */
  private prependContent(content: string): void {
    const existingContents = this.dict.get("Contents");
    const newContent = this.createContentStream(`${content}\n`);

    if (!existingContents) {
      // No existing content - just set our stream
      this.dict.set("Contents", newContent);
    } else if (existingContents instanceof PdfRef) {
      // Reference to a stream - wrap in array with our content first
      this.dict.set("Contents", new PdfArray([newContent, existingContents]));
    } else if (existingContents instanceof PdfStream) {
      // Direct stream - wrap in array with our content first
      this.dict.set("Contents", new PdfArray([newContent, existingContents]));
    } else if (existingContents instanceof PdfArray) {
      // Array of streams/refs - prepend our stream
      existingContents.insert(0, newContent);
    }
  }

  /**
   * Append content to the page's content stream (for foreground drawing).
   */
  private appendContent(content: string): void {
    const existingContents = this.dict.get("Contents");
    const newContent = this.createContentStream(`\n${content}`);

    if (!existingContents) {
      // No existing content - just set our stream
      this.dict.set("Contents", newContent);
    } else if (existingContents instanceof PdfRef) {
      // Reference to a stream - wrap in array with existing first, then our content
      this.dict.set("Contents", new PdfArray([existingContents, newContent]));
    } else if (existingContents instanceof PdfStream) {
      // Direct stream - wrap in array with existing first, then our content
      this.dict.set("Contents", new PdfArray([existingContents, newContent]));
    } else if (existingContents instanceof PdfArray) {
      // Array of streams/refs - append our stream
      existingContents.push(newContent);
    }
  }

  /**
   * Get a box (MediaBox, CropBox, etc.) from the page dictionary.
   */
  private getBox(name: string): Rectangle | null {
    const box = this.dict.get(name);

    if (!(box instanceof PdfArray) || box.length < 4) {
      return null;
    }

    const x1 = box.at(0);
    const y1 = box.at(1);
    const x2 = box.at(2);
    const y2 = box.at(3);

    if (
      !(x1 instanceof PdfNumber) ||
      !(y1 instanceof PdfNumber) ||
      !(x2 instanceof PdfNumber) ||
      !(y2 instanceof PdfNumber)
    ) {
      return null;
    }

    return {
      x1: x1.value,
      y1: y1.value,
      x2: x2.value,
      y2: y2.value,
    };
  }
}
