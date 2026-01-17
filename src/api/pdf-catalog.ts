/**
 * PDFCatalog - Wrapper for the PDF document catalog (root dictionary).
 *
 * The catalog is the root of the document's object hierarchy and contains
 * references to other key structures like the page tree, name trees,
 * outlines, etc.
 *
 * PDF Reference: Section 7.7.2 "Document Catalog"
 */

import { NameTree } from "#src/document/name-tree";
import type { ObjectRegistry } from "#src/document/object-registry";
import { PdfDict } from "#src/objects/pdf-dict";
import { PdfRef } from "#src/objects/pdf-ref";

/**
 * PDFCatalog provides access to the document catalog and its sub-structures.
 */
export class PDFCatalog {
  /** The underlying catalog dictionary */
  private readonly dict: PdfDict;

  /** Registry for resolving references */
  private readonly registry: ObjectRegistry;

  /** Cached name trees */
  private _embeddedFilesTree: NameTree | null | undefined = undefined;

  constructor(dict: PdfDict, registry: ObjectRegistry) {
    this.dict = dict;
    this.registry = registry;
  }

  /**
   * Get the underlying catalog dictionary.
   */
  getDict(): PdfDict {
    return this.dict;
  }

  /**
   * Remove the /AcroForm entry from the catalog.
   * Called after form flattening to fully remove form interactivity.
   */
  removeAcroForm(): void {
    this.dict.delete("AcroForm");
  }

  /**
   * Get the /Names dictionary.
   */
  getNames(): PdfDict | null {
    let namesEntry = this.dict.get("Names");

    if (namesEntry instanceof PdfRef) {
      namesEntry = this.registry.resolve(namesEntry) ?? undefined;
    }

    return namesEntry instanceof PdfDict ? namesEntry : null;
  }

  /**
   * Get or create the /Names dictionary.
   */
  getOrCreateNames(): PdfDict {
    let names = this.getNames();

    if (!names) {
      names = new PdfDict();

      this.dict.set("Names", this.registry.register(names));
    }

    return names;
  }

  /**
   * Get the EmbeddedFiles name tree.
   * Caches the result for repeated access.
   */
  getEmbeddedFilesTree(): NameTree | null {
    if (this._embeddedFilesTree !== undefined) {
      return this._embeddedFilesTree;
    }

    const names = this.getNames();

    if (!names) {
      this._embeddedFilesTree = null;

      return null;
    }

    const embeddedFilesEntry = names.get("EmbeddedFiles");
    let embeddedFiles: PdfDict | null = null;

    if (embeddedFilesEntry instanceof PdfRef) {
      const resolved = this.registry.resolve(embeddedFilesEntry);

      if (resolved instanceof PdfDict) {
        embeddedFiles = resolved;
      }
    } else if (embeddedFilesEntry instanceof PdfDict) {
      embeddedFiles = embeddedFilesEntry;
    }

    if (!embeddedFiles) {
      this._embeddedFilesTree = null;

      return null;
    }

    this._embeddedFilesTree = new NameTree(embeddedFiles, ref => this.registry.resolve(ref));

    return this._embeddedFilesTree;
  }

  /**
   * Set the EmbeddedFiles name tree.
   */
  setEmbeddedFilesTree(treeDict: PdfDict): void {
    const names = this.getOrCreateNames();
    const treeRef = this.registry.register(treeDict);

    names.set("EmbeddedFiles", treeRef);

    // Clear cache
    this._embeddedFilesTree = undefined;
  }

  /**
   * Remove the EmbeddedFiles entry from /Names.
   */
  removeEmbeddedFilesTree(): void {
    const names = this.getNames();

    if (names) {
      names.delete("EmbeddedFiles");
    }

    // Clear cache
    this._embeddedFilesTree = undefined;
  }

  /**
   * Clear all cached name trees.
   * Call this after modifying the catalog structure.
   */
  clearCache(): void {
    this._embeddedFilesTree = undefined;
  }
}
