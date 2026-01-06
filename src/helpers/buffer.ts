/**
 * Buffer utilities for working with ArrayBuffer and Uint8Array.
 */

/**
 * Ensure we have a proper ArrayBuffer (not SharedArrayBuffer or slice).
 *
 * Web Crypto APIs require a true ArrayBuffer, not a view into one.
 *
 * @param data - Uint8Array to convert
 * @returns ArrayBuffer containing the data
 */
export function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  if (
    data.buffer instanceof ArrayBuffer &&
    data.byteOffset === 0 &&
    data.byteLength === data.buffer.byteLength
  ) {
    return data.buffer;
  }

  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}
