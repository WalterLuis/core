/**
 * PDF object serialization.
 *
 * Converts PdfObject instances to PDF byte format for writing.
 *
 * This module provides the public API for serialization. The actual
 * byte-writing logic lives in each object's toBytes() method.
 */

import { ByteWriter } from "#src/io/byte-writer";
import type { PdfObject } from "#src/objects/pdf-object.ts";
import type { PdfRef } from "#src/objects/pdf-ref";

/**
 * Serialize a PDF object to bytes.
 *
 * @param obj - The object to serialize
 * @returns The PDF byte representation
 */
export function serializeObject(obj: PdfObject): Uint8Array {
  const writer = new ByteWriter();

  // All PdfObject types implement PdfPrimitive
  obj.toBytes(writer);

  return writer.toBytes();
}

/**
 * Serialize an indirect object definition.
 *
 * Format: "N G obj\n[object]\nendobj\n"
 *
 * @param ref - The object reference
 * @param obj - The object to serialize
 * @returns The complete indirect object definition
 */
export function serializeIndirectObject(ref: PdfRef, obj: PdfObject): Uint8Array {
  const writer = new ByteWriter();

  writer.writeAscii(`${ref.objectNumber} ${ref.generation} obj\n`);
  obj.toBytes(writer);
  writer.writeAscii("\nendobj\n");

  return writer.toBytes();
}
