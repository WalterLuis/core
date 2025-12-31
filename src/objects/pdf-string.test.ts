import { describe, expect, it } from "vitest";
import { PdfString } from "./pdf-string";

describe("PdfString", () => {
  it("has type 'string'", () => {
    expect(PdfString.fromString("test").type).toBe("string");
  });

  describe("fromString", () => {
    it("encodes string as UTF-8 bytes", () => {
      const str = PdfString.fromString("Hello");

      expect(str.bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
    });

    it("sets format to 'literal'", () => {
      expect(PdfString.fromString("test").format).toBe("literal");
    });

    it("decodes back via asString()", () => {
      const str = PdfString.fromString("Hello World");

      expect(str.asString()).toBe("Hello World");
    });

    it("handles unicode", () => {
      const str = PdfString.fromString("Héllo 世界");

      expect(str.asString()).toBe("Héllo 世界");
    });
  });

  describe("fromHex", () => {
    it("decodes hex string to bytes", () => {
      const str = PdfString.fromHex("48656C6C6F");

      expect(str.bytes).toEqual(new Uint8Array([72, 101, 108, 108, 111]));
      expect(str.asString()).toBe("Hello");
    });

    it("sets format to 'hex'", () => {
      expect(PdfString.fromHex("4142").format).toBe("hex");
    });

    it("ignores whitespace in hex", () => {
      const str = PdfString.fromHex("48 65 6C 6C 6F");

      expect(str.asString()).toBe("Hello");
    });

    it("pads odd-length hex with trailing 0", () => {
      // "F" becomes "F0" = 240
      const str = PdfString.fromHex("F");

      expect(str.bytes).toEqual(new Uint8Array([0xf0]));
    });

    it("handles empty hex", () => {
      const str = PdfString.fromHex("");

      expect(str.bytes.length).toBe(0);
    });
  });

  describe("raw bytes constructor", () => {
    it("stores provided bytes directly", () => {
      const bytes = new Uint8Array([0x00, 0xff, 0x42]);
      const str = new PdfString(bytes);

      expect(str.bytes).toBe(bytes);
    });
  });
});
