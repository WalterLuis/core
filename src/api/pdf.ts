/**
 * High-level PDF document API.
 *
 * Provides a user-friendly interface for loading, modifying, and saving PDFs.
 * Wraps the low-level parsing and writing infrastructure.
 */

import {
  type AddAttachmentOptions,
  type AttachmentInfo,
  createEmbeddedFileStream,
  createFileSpec,
  getEmbeddedFileStream,
  parseFileSpec,
} from "#src/attachments";
import { hasChanges } from "#src/document/change-collector";
import {
  checkIncrementalSaveBlocker,
  type IncrementalSaveBlocker,
  isLinearizationDict,
} from "#src/document/linearization";
import { buildNameTree, NameTree } from "#src/document/name-tree";
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

  /** Cached embedded files tree (undefined = not loaded, null = no tree) */
  private embeddedFilesTree: NameTree | null | undefined = undefined;

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
  // Attachments
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Get the embedded files name tree.
   * Caches the result for repeated access.
   */
  private async getEmbeddedFilesTree(): Promise<NameTree | null> {
    if (this.embeddedFilesTree !== undefined) {
      return this.embeddedFilesTree;
    }

    const catalog = await this.getCatalog();
    if (!catalog) {
      this.embeddedFilesTree = null;
      return null;
    }

    // Get /Names dictionary
    const namesEntry = catalog.get("Names");
    let names: PdfDict | null = null;

    if (namesEntry instanceof PdfRef) {
      const resolved = await this.getObject(namesEntry);
      if (resolved instanceof PdfDict) {
        names = resolved;
      }
    } else if (namesEntry instanceof PdfDict) {
      names = namesEntry;
    }

    if (!names) {
      this.embeddedFilesTree = null;
      return null;
    }

    // Get /EmbeddedFiles entry
    const embeddedFilesEntry = names.get("EmbeddedFiles");
    let embeddedFiles: PdfDict | null = null;

    if (embeddedFilesEntry instanceof PdfRef) {
      const resolved = await this.getObject(embeddedFilesEntry);
      if (resolved instanceof PdfDict) {
        embeddedFiles = resolved;
      }
    } else if (embeddedFilesEntry instanceof PdfDict) {
      embeddedFiles = embeddedFilesEntry;
    }

    if (!embeddedFiles) {
      this.embeddedFilesTree = null;
      return null;
    }

    this.embeddedFilesTree = new NameTree(embeddedFiles, this.getObject.bind(this));
    return this.embeddedFilesTree;
  }

  /**
   * List all attachments in the document.
   *
   * @returns Map of attachment name to attachment info
   */
  async getAttachments(): Promise<Map<string, AttachmentInfo>> {
    const result = new Map<string, AttachmentInfo>();
    const tree = await this.getEmbeddedFilesTree();

    if (!tree) {
      return result;
    }

    for await (const [name, value] of tree.entries()) {
      if (!(value instanceof PdfDict)) {
        continue;
      }

      const info = await parseFileSpec(value, name, this.getObject.bind(this));

      if (info) {
        result.set(name, info);
      } else {
        // External file reference - skip but warn
        this.warnings.push(`Attachment "${name}" is an external file reference (not embedded)`);
      }
    }

    return result;
  }

  /**
   * Get the raw bytes of an attachment.
   *
   * @param name The attachment name (key in the EmbeddedFiles tree)
   * @returns The attachment bytes, or null if not found
   */
  async getAttachment(name: string): Promise<Uint8Array | null> {
    const tree = await this.getEmbeddedFilesTree();

    if (!tree) {
      return null;
    }

    const fileSpec = await tree.get(name);

    if (!(fileSpec instanceof PdfDict)) {
      return null;
    }

    const stream = await getEmbeddedFileStream(fileSpec, this.getObject.bind(this));

    if (!stream) {
      return null;
    }

    return stream.getDecodedData();
  }

  /**
   * Check if an attachment exists.
   *
   * @param name The attachment name
   * @returns True if the attachment exists
   */
  async hasAttachment(name: string): Promise<boolean> {
    const tree = await this.getEmbeddedFilesTree();

    if (!tree) {
      return false;
    }

    return tree.has(name);
  }

  /**
   * Add a file attachment to the document.
   *
   * @param name The attachment name (key in the EmbeddedFiles tree)
   * @param data The file data
   * @param options Attachment options (description, MIME type, dates)
   * @throws Error if name already exists and overwrite !== true
   */
  async addAttachment(
    name: string,
    data: Uint8Array,
    options: AddAttachmentOptions = {},
  ): Promise<void> {
    // Check if attachment already exists
    if (!options.overwrite && (await this.hasAttachment(name))) {
      throw new Error(`Attachment "${name}" already exists. Use { overwrite: true } to replace.`);
    }

    // Create the embedded file stream
    const embeddedFileStream = createEmbeddedFileStream(data, name, options);
    const embeddedFileRef = this.register(embeddedFileStream);

    // Create the file specification
    const fileSpec = createFileSpec(name, embeddedFileRef, options);
    const fileSpecRef = this.register(fileSpec);

    // Get or create the /Names dictionary in the catalog
    const catalog = await this.getCatalog();

    if (!catalog) {
      throw new Error("Document has no catalog");
    }

    // Collect all existing attachments
    const existingAttachments: Array<[string, PdfRef]> = [];
    const tree = await this.getEmbeddedFilesTree();

    if (tree) {
      for await (const [key, value] of tree.entries()) {
        if (key === name && options.overwrite) {
          // Skip the one we're replacing
          continue;
        }

        // Get the ref for this file spec
        const ref = this.registry.getRef(value);

        if (ref) {
          existingAttachments.push([key, ref]);
        }
      }
    }

    // Add the new attachment
    existingAttachments.push([name, fileSpecRef]);

    // Build new name tree
    const newNameTree = buildNameTree(existingAttachments);
    const nameTreeRef = this.register(newNameTree);

    // Get or create /Names dict
    let names: PdfDict;
    const namesEntry = catalog.get("Names");

    if (namesEntry instanceof PdfRef) {
      const resolved = await this.getObject(namesEntry);

      if (resolved instanceof PdfDict) {
        names = resolved;
      } else {
        names = new PdfDict();
        catalog.set("Names", this.register(names));
      }
    } else if (namesEntry instanceof PdfDict) {
      names = namesEntry;
    } else {
      names = new PdfDict();
      catalog.set("Names", this.register(names));
    }

    // Set /EmbeddedFiles to point to new tree
    names.set("EmbeddedFiles", nameTreeRef);

    // Clear the cached tree so it gets reloaded
    this.embeddedFilesTree = undefined;
  }

  /**
   * Remove an attachment from the document.
   *
   * @param name The attachment name
   * @returns True if the attachment was removed, false if not found
   */
  async removeAttachment(name: string): Promise<boolean> {
    const tree = await this.getEmbeddedFilesTree();

    if (!tree) {
      return false;
    }

    // Check if it exists
    if (!(await tree.has(name))) {
      return false;
    }

    // Collect all attachments except the one to remove
    const remainingAttachments: Array<[string, PdfRef]> = [];

    for await (const [key, value] of tree.entries()) {
      if (key === name) {
        continue; // Skip the one we're removing
      }

      const ref = this.registry.getRef(value);

      if (ref) {
        remainingAttachments.push([key, ref]);
      }
    }

    // Get catalog and /Names
    const catalog = await this.getCatalog();

    if (!catalog) {
      return false;
    }

    const namesEntry = catalog.get("Names");
    let names: PdfDict | null = null;

    if (namesEntry instanceof PdfRef) {
      const resolved = await this.getObject(namesEntry);

      if (resolved instanceof PdfDict) {
        names = resolved;
      }
    } else if (namesEntry instanceof PdfDict) {
      names = namesEntry;
    }

    if (!names) {
      return false;
    }

    if (remainingAttachments.length === 0) {
      // No attachments left - remove /EmbeddedFiles entry
      names.delete("EmbeddedFiles");
    } else {
      // Build new tree with remaining attachments
      const newNameTree = buildNameTree(remainingAttachments);
      const nameTreeRef = this.register(newNameTree);

      names.set("EmbeddedFiles", nameTreeRef);
    }

    // Clear the cached tree
    this.embeddedFilesTree = undefined;

    return true;
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
