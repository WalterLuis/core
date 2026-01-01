/**
 * High-level PDF document API.
 *
 * Provides a user-friendly interface for loading, modifying, and saving PDFs.
 * Wraps the low-level parsing and writing infrastructure.
 */

import { hasChanges } from "#src/document/change-collector";
import {
  checkIncrementalSaveBlocker,
  type IncrementalSaveBlocker,
  isLinearizationDict,
} from "#src/document/linearization";
import { ObjectRegistry } from "#src/document/object-registry";
import { Scanner } from "#src/io/scanner";
import { PdfArray } from "#src/objects/pdf-array";
import { PdfDict } from "#src/objects/pdf-dict";
import type { PdfObject } from "#src/objects/pdf-object.ts";
import { PdfRef } from "#src/objects/pdf-ref";
import { PdfStream } from "#src/objects/pdf-stream";
import {
  DocumentParser,
  type ParsedDocument,
  type ParseOptions,
} from "#src/parser/document-parser";
import { XRefParser } from "#src/parser/xref-parser";
import { writeComplete, writeIncremental } from "#src/writer/pdf-writer";

/**
 * Options for loading a PDF.
 */
export interface LoadOptions extends ParseOptions {
  // Inherits credentials, lenient from ParseOptions
}

/**
 * Options for saving a PDF.
 */
export interface SaveOptions {
  /** Save incrementally (append only). Default: false */
  incremental?: boolean;

  /** Use XRef stream instead of table. Default: matches original format */
  useXRefStream?: boolean;
}

/**
 * High-level PDF document class.
 *
 * @example
 * ```typescript
 * // Load a PDF
 * const pdf = await PDF.load(bytes);
 *
 * // Modify it
 * const catalog = await pdf.getCatalog();
 * catalog.set("ModDate", PdfString.fromString("D:20240101"));
 *
 * // Save with incremental update (preserves signatures)
 * const saved = await pdf.save({ incremental: true });
 *
 * // Or save with full rewrite
 * const rewritten = await pdf.save();
 * ```
 */
export class PDF {
  private readonly parsed: ParsedDocument;
  private readonly registry: ObjectRegistry;
  private readonly originalBytes: Uint8Array;
  private readonly originalXRefOffset: number;

  /** Whether this document was recovered via brute-force parsing */
  readonly recoveredViaBruteForce: boolean;

  /** Whether this document is linearized */
  readonly isLinearized: boolean;

  /** Warnings from parsing and operations */
  readonly warnings: string[];

  private constructor(
    parsed: ParsedDocument,
    registry: ObjectRegistry,
    originalBytes: Uint8Array,
    originalXRefOffset: number,
    options: {
      recoveredViaBruteForce: boolean;
      isLinearized: boolean;
    },
  ) {
    this.parsed = parsed;
    this.registry = registry;
    this.originalBytes = originalBytes;
    this.originalXRefOffset = originalXRefOffset;
    this.recoveredViaBruteForce = options.recoveredViaBruteForce;
    this.isLinearized = options.isLinearized;
    this.warnings = [...parsed.warnings];
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Load a PDF from bytes.
   */
  static async load(bytes: Uint8Array, options?: LoadOptions): Promise<PDF> {
    const scanner = new Scanner(bytes);
    const parser = new DocumentParser(scanner, options);

    const parsed = await parser.parse();

    // Create registry from xref
    const registry = new ObjectRegistry(parsed.xref);

    // Detect linearization by checking first object
    let isLinearized = false;

    try {
      // Find the first object (lowest object number)
      const firstObjNum = Math.min(...parsed.xref.keys());

      if (firstObjNum > 0) {
        const firstObj = await parsed.getObject(PdfRef.of(firstObjNum, 0));

        if (firstObj instanceof PdfDict && isLinearizationDict(firstObj)) {
          isLinearized = true;
        }
      }
    } catch {
      // Ignore errors during linearization detection
    }

    // Find original xref offset
    const xrefParser = new XRefParser(scanner);
    let originalXRefOffset: number;

    try {
      originalXRefOffset = xrefParser.findStartXRef();
    } catch {
      originalXRefOffset = 0;
    }

    return new PDF(parsed, registry, bytes, originalXRefOffset, {
      recoveredViaBruteForce: parsed.recoveredViaBruteForce,
      isLinearized,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Document info
  // ─────────────────────────────────────────────────────────────────────────────

  /** PDF version string (e.g., "1.7", "2.0") */
  get version(): string {
    return this.parsed.version;
  }

  /** Whether the document is encrypted */
  get isEncrypted(): boolean {
    return this.parsed.isEncrypted;
  }

  /** Whether authentication succeeded (for encrypted docs) */
  get isAuthenticated(): boolean {
    return this.parsed.isAuthenticated;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Object access
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get an object by reference.
   *
   * Objects are cached and tracked for modifications.
   */
  async getObject(ref: PdfRef): Promise<PdfObject | null> {
    // Check registry first (for new/loaded objects we're tracking)
    const tracked = this.registry.getObject(ref);

    if (tracked !== undefined) {
      return tracked;
    }

    // Load from parsed document
    const obj = await this.parsed.getObject(ref);

    if (obj !== null) {
      // Add to registry for tracking
      this.registry.addLoaded(ref, obj);
    }

    return obj;
  }

  /**
   * Get the document catalog.
   */
  async getCatalog(): Promise<PdfDict | null> {
    const rootRef = this.parsed.trailer.getRef("Root");

    if (!rootRef) {
      return null;
    }

    const root = await this.getObject(rootRef);

    return root instanceof PdfDict ? root : null;
  }

  /**
   * Get all page references.
   */
  async getPages(): Promise<PdfRef[]> {
    return this.parsed.getPages();
  }

  /**
   * Get page count.
   */
  async getPageCount(): Promise<number> {
    return this.parsed.getPageCount();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Object creation
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Register a new object, assigning it a reference.
   *
   * The object will be written on the next save.
   */
  register(obj: PdfObject): PdfRef {
    return this.registry.register(obj);
  }

  /**
   * Create and register a new dictionary.
   */
  createDict(entries?: Record<string, PdfObject> | [string, PdfObject][]): PdfRef {
    let dict: PdfDict;

    if (Array.isArray(entries)) {
      dict = new PdfDict(entries);
    } else if (entries) {
      dict = PdfDict.of(entries);
    } else {
      dict = new PdfDict();
    }

    return this.register(dict);
  }

  /**
   * Create and register a new array.
   */
  createArray(items?: PdfObject[]): PdfRef {
    const arr = items ? new PdfArray(items) : new PdfArray();

    return this.register(arr);
  }

  /**
   * Create and register a new stream.
   */
  createStream(
    dictEntries: Record<string, PdfObject> | [string, PdfObject][],
    data: Uint8Array,
  ): PdfRef {
    let stream: PdfStream;

    if (Array.isArray(dictEntries)) {
      stream = new PdfStream(dictEntries, data);
    } else {
      stream = PdfStream.fromDict(dictEntries, data);
    }

    return this.register(stream);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Change tracking
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Check if the document has unsaved changes.
   */
  hasChanges(): boolean {
    return hasChanges(this.registry);
  }

  /**
   * Check if incremental save is possible.
   *
   * Returns null if possible, or the blocker reason if not.
   */
  canSaveIncrementally(): IncrementalSaveBlocker | null {
    return checkIncrementalSaveBlocker({
      isLinearized: this.isLinearized,
      recoveredViaBruteForce: this.recoveredViaBruteForce,
      encryptionChanged: false, // TODO: track encryption changes
      encryptionAdded: false,
      encryptionRemoved: false,
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Saving
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Save the PDF.
   *
   * @param options - Save options
   * @returns The saved PDF bytes
   */
  async save(options: SaveOptions = {}): Promise<Uint8Array> {
    const wantsIncremental = options.incremental ?? false;
    const blocker = this.canSaveIncrementally();

    // Check if incremental is requested but not possible
    if (wantsIncremental && blocker !== null) {
      this.warnings.push(`Incremental save not possible (${blocker}), performing full save`);
    }

    const useIncremental = wantsIncremental && blocker === null;

    // If no changes, return original bytes
    if (!this.hasChanges()) {
      return this.originalBytes;
    }

    // Get root reference from trailer
    const root = this.parsed.trailer.getRef("Root");

    if (!root) {
      throw new Error("Document has no catalog (missing /Root in trailer)");
    }

    // Get optional info reference
    const info = this.parsed.trailer.getRef("Info");

    // TODO: Handle encryption, ID arrays properly
    const useXRefStream = options.useXRefStream;

    if (useIncremental) {
      const result = await writeIncremental(this.registry, {
        originalBytes: this.originalBytes,
        originalXRefOffset: this.originalXRefOffset,
        root,
        info: info ?? undefined,
        useXRefStream,
      });

      return result.bytes;
    }

    // For full save with changes, we need all referenced objects loaded
    // Walk from catalog to ensure we have everything
    await this.ensureObjectsLoaded();

    // Full save
    const result = await writeComplete(this.registry, {
      version: this.parsed.version,
      root,
      info: info ?? undefined,
      useXRefStream,
    });

    return result.bytes;
  }

  /**
   * Ensure all reachable objects are loaded into the registry.
   *
   * Walks from the catalog to load all referenced objects.
   */
  private async ensureObjectsLoaded(): Promise<void> {
    const visited = new Set<string>();

    const walk = async (obj: PdfObject | null): Promise<void> => {
      if (obj === null) return;

      if (obj instanceof PdfRef) {
        const key = `${obj.objectNumber} ${obj.generation}`;

        if (visited.has(key)) return;

        visited.add(key);

        const resolved = await this.getObject(obj);

        await walk(resolved);
      } else if (obj instanceof PdfDict) {
        for (const [, value] of obj) {
          await walk(value);
        }
      } else if (obj instanceof PdfArray) {
        for (const item of obj) {
          await walk(item);
        }
      }
    };

    // Start from root
    const root = this.parsed.trailer.getRef("Root");

    if (root) {
      await walk(root);
    }

    // Also load Info if present
    const info = this.parsed.trailer.getRef("Info");

    if (info) {
      await walk(info);
    }
  }
}
