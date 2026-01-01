/**
 * File Specification helpers for PDF attachments.
 *
 * FileSpec dictionaries describe embedded files in PDFs.
 * Structure:
 * - /Type /Filespec
 * - /F (ASCII filename)
 * - /UF (Unicode filename, preferred)
 * - /Desc (description)
 * - /EF << /F streamRef >> (embedded file dict)
 *
 * The embedded file stream has:
 * - /Type /EmbeddedFile
 * - /Subtype (MIME type as name, e.g., /application#2Fpdf)
 * - /Params << /Size N /CreationDate ... /ModDate ... >>
 *
 * @see PDF 1.7 spec section 7.11.3
 */

import { PdfDict } from "#src/objects/pdf-dict";
import { PdfName } from "#src/objects/pdf-name";
import { PdfNumber } from "#src/objects/pdf-number";
import type { PdfObject } from "#src/objects/pdf-object";
import { PdfRef } from "#src/objects/pdf-ref";
import { PdfStream } from "#src/objects/pdf-stream";
import { PdfString } from "#src/objects/pdf-string";
import type { AddAttachmentOptions, AttachmentInfo } from "./types";

/**
 * Function to resolve a reference to its object.
 */
type Resolver = (ref: PdfRef) => Promise<PdfObject | null>;

/**
 * MIME type mappings for auto-detection.
 */
const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".json": "application/json",
  ".html": "text/html",
  ".htm": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".zip": "application/zip",
  ".gz": "application/gzip",
  ".tar": "application/x-tar",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".csv": "text/csv",
  ".rtf": "application/rtf",
};

/**
 * Get MIME type from filename extension.
 */
export function getMimeType(filename: string): string | undefined {
  const lastDot = filename.lastIndexOf(".");

  if (lastDot === -1) {
    return undefined;
  }

  const ext = filename.slice(lastDot).toLowerCase();

  return MIME_TYPES[ext];
}

/**
 * Get filename from a FileSpec dictionary.
 *
 * Tries keys in order: /UF → /F → /Unix → /Mac → /DOS
 * Falls back to "unnamed" if none found.
 */
export function getFilename(fileSpec: PdfDict): string {
  // Try /UF (Unicode filename) first - preferred
  const uf = fileSpec.getString("UF");

  if (uf) {
    return decodeFilename(uf);
  }

  // Try /F (ASCII filename)
  const f = fileSpec.getString("F");

  if (f) {
    return decodeFilename(f);
  }

  // Try platform-specific keys (legacy)
  for (const key of ["Unix", "Mac", "DOS"]) {
    const value = fileSpec.getString(key);

    if (value) {
      return decodeFilename(value);
    }
  }

  return "unnamed";
}

/**
 * Decode a PDF filename string.
 * Handles path separators and escape sequences.
 */
function decodeFilename(str: PdfString): string {
  let filename = str.asString();

  // Replace PDF path separators with forward slash
  filename = filename.replaceAll("\\\\", "\\").replaceAll("\\/", "/").replaceAll("\\", "/");

  // Extract just the filename (strip path)
  const lastSlash = filename.lastIndexOf("/");

  if (lastSlash !== -1) {
    filename = filename.slice(lastSlash + 1);
  }

  return filename || "unnamed";
}

/**
 * Parse a PDF date string into a JavaScript Date.
 *
 * PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
 * Example: D:20240115123045+05'30'
 */
export function parsePdfDate(str: string): Date | undefined {
  // Remove D: prefix if present
  let s = str;

  if (s.startsWith("D:")) {
    s = s.slice(2);
  }

  // Minimum: YYYY (4 chars) and must start with digits

  if (s.length < 4 || !/^\d{4}/.test(s)) {
    return undefined;
  }

  try {
    const year = parseInt(s.slice(0, 4), 10);
    const month = s.length >= 6 ? parseInt(s.slice(4, 6), 10) - 1 : 0;
    const day = s.length >= 8 ? parseInt(s.slice(6, 8), 10) : 1;
    const hour = s.length >= 10 ? parseInt(s.slice(8, 10), 10) : 0;
    const minute = s.length >= 12 ? parseInt(s.slice(10, 12), 10) : 0;
    const second = s.length >= 14 ? parseInt(s.slice(12, 14), 10) : 0;

    // Validate parsed values

    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
      return undefined;
    }

    // Parse timezone if present
    let tzOffset = 0;

    if (s.length >= 15) {
      const tzChar = s.charAt(14);

      if (tzChar === "Z") {
        tzOffset = 0;
      } else if (tzChar === "+" || tzChar === "-") {
        const tzHour = parseInt(s.slice(15, 17), 10) || 0;
        const tzMin = parseInt(s.slice(18, 20), 10) || 0;
        tzOffset = (tzHour * 60 + tzMin) * (tzChar === "-" ? 1 : -1);
      }
    }

    const date = new Date(Date.UTC(year, month, day, hour, minute, second));
    date.setUTCMinutes(date.getUTCMinutes() + tzOffset);

    return date;
  } catch {
    return undefined;
  }
}

/**
 * Format a JavaScript Date as a PDF date string.
 */
export function formatPdfDate(date: Date): string {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");

  return `D:${year}${month}${day}${hour}${minute}${second}Z`;
}

/**
 * Get the embedded file stream from a FileSpec dictionary.
 *
 * @returns The stream if found, null if external reference or missing
 */
export async function getEmbeddedFileStream(
  fileSpec: PdfDict,
  resolver: Resolver,
): Promise<PdfStream | null> {
  // Get /EF (embedded file dictionary)
  const efEntry = fileSpec.get("EF");
  let ef: PdfDict | null = null;

  if (efEntry instanceof PdfRef) {
    const resolved = await resolver(efEntry);

    if (resolved instanceof PdfDict) {
      ef = resolved;
    }
  } else if (efEntry instanceof PdfDict) {
    ef = efEntry;
  }

  if (!ef) {
    return null; // External file reference
  }

  // Get /F entry (or /UF) from EF dict - points to the stream
  const streamRef = ef.getRef("F") ?? ef.getRef("UF");

  if (!streamRef) {
    return null;
  }

  const stream = await resolver(streamRef);

  if (stream instanceof PdfStream) {
    return stream;
  }

  return null;
}

/**
 * Parse a FileSpec dictionary into AttachmentInfo.
 *
 * @param fileSpec The FileSpec dictionary
 * @param name The key name from the EmbeddedFiles tree
 * @param resolver Function to resolve references
 * @returns AttachmentInfo or null if external file reference
 */
export async function parseFileSpec(
  fileSpec: PdfDict,
  name: string,
  resolver: Resolver,
): Promise<AttachmentInfo | null> {
  // Get the embedded file stream
  const stream = await getEmbeddedFileStream(fileSpec, resolver);

  if (!stream) {
    // External file reference - we don't support these
    return null;
  }

  const info: AttachmentInfo = {
    name,
    filename: getFilename(fileSpec),
  };

  // Get description
  const desc = fileSpec.getString("Desc");

  if (desc) {
    info.description = desc.asString();
  }

  // Get MIME type from stream's /Subtype
  const subtype = stream.getName("Subtype");

  if (subtype) {
    // /Subtype is a name like /application#2Fpdf
    // Need to decode the # sequences
    info.mimeType = subtype.value.replaceAll("#2F", "/").replaceAll("#20", " ");
  }

  // Get params from stream
  const paramsEntry = stream.get("Params");
  let params: PdfDict | null = null;

  if (paramsEntry instanceof PdfRef) {
    const resolved = await resolver(paramsEntry);

    if (resolved instanceof PdfDict) {
      params = resolved;
    }
  } else if (paramsEntry instanceof PdfDict) {
    params = paramsEntry;
  }

  if (params) {
    // Size
    const size = params.getNumber("Size");

    if (size) {
      info.size = size.value;
    }

    // Creation date
    const creationDate = params.getString("CreationDate");

    if (creationDate) {
      info.createdAt = parsePdfDate(creationDate.asString());
    }

    // Modification date
    const modDate = params.getString("ModDate");

    if (modDate) {
      info.modifiedAt = parsePdfDate(modDate.asString());
    }
  }

  // If size wasn't in Params, compute from decoded stream data
  if (info.size === undefined) {
    const data = await stream.getDecodedData();
    info.size = data.length;
  }

  return info;
}

/**
 * Create an embedded file stream.
 *
 * @param data The file data
 * @param filename Used for MIME type detection
 * @param options Creation options
 * @returns A PdfStream for the embedded file
 */
export function createEmbeddedFileStream(
  data: Uint8Array,
  filename: string,
  options: AddAttachmentOptions = {},
): PdfStream {
  const now = new Date();
  const mimeType = options.mimeType ?? getMimeType(filename);

  // Build params dictionary
  const paramsEntries: Array<[string, PdfObject]> = [["Size", PdfNumber.of(data.length)]];

  const createdAt = options.createdAt ?? now;
  paramsEntries.push(["CreationDate", PdfString.fromString(formatPdfDate(createdAt))]);

  const modifiedAt = options.modifiedAt ?? now;
  paramsEntries.push(["ModDate", PdfString.fromString(formatPdfDate(modifiedAt))]);

  const params = new PdfDict(paramsEntries);

  // Build stream dictionary entries
  const streamEntries: Array<[string, PdfObject]> = [
    ["Type", PdfName.of("EmbeddedFile")],
    ["Params", params],
  ];

  // Add MIME type if known

  if (mimeType) {
    // Encode MIME type as PDF name (replace / with #2F)
    const encodedMime = mimeType.replaceAll("/", "#2F").replaceAll(" ", "#20");
    streamEntries.push(["Subtype", PdfName.of(encodedMime)]);
  }

  return new PdfStream(streamEntries, data);
}

/**
 * Create a FileSpec dictionary for an embedded file.
 *
 * @param filename The filename to display
 * @param embeddedFileRef Reference to the embedded file stream
 * @param options Creation options
 * @returns A PdfDict for the FileSpec
 */
export function createFileSpec(
  filename: string,
  embeddedFileRef: PdfRef,
  options: AddAttachmentOptions = {},
): PdfDict {
  const entries: Array<[string, PdfObject]> = [
    ["Type", PdfName.of("Filespec")],
    ["F", PdfString.fromString(filename)],
    ["UF", PdfString.fromString(filename)], // Unicode version
    ["EF", PdfDict.of({ F: embeddedFileRef })],
  ];

  if (options.description) {
    entries.push(["Desc", PdfString.fromString(options.description)]);
  }

  return new PdfDict(entries);
}

/**
 * Encode MIME type as a PDF name (for /Subtype).
 * Replaces special characters with # hex sequences.
 */
export function encodeMimeTypeAsName(mimeType: string): PdfName {
  const encoded = mimeType.replaceAll("/", "#2F").replaceAll(" ", "#20");

  return PdfName.of(encoded);
}
