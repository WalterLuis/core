/**
 * PDF file attachments module.
 */

export {
  createEmbeddedFileStream,
  createFileSpec,
  formatPdfDate,
  getEmbeddedFileStream,
  getFilename,
  getMimeType,
  parseFileSpec,
  parsePdfDate,
} from "./file-spec";
export type { AddAttachmentOptions, AttachmentInfo } from "./types";
