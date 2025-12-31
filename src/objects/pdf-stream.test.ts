import { describe, expect, it, vi } from "vitest";
import { PdfDict } from "./pdf-dict";
import { PdfName } from "./pdf-name";
import { PdfNumber } from "./pdf-number";
import { PdfStream } from "./pdf-stream";

describe("PdfStream", () => {
  it("has type 'stream'", () => {
    expect(new PdfStream().type).toBe("stream");
  });

  it("starts with empty data", () => {
    const stream = new PdfStream();

    expect(stream.data.length).toBe(0);
  });

  it("can be constructed with data", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const stream = new PdfStream(undefined, data);

    expect(stream.data).toBe(data);
  });

  it("can be constructed from dict entries", () => {
    const stream = new PdfStream([
      ["Length", PdfNumber.of(5)],
      ["Filter", PdfName.FlateDecode],
    ]);

    expect(stream.getNumber("Length")).toBe(5);
    expect(stream.getName("Filter")).toBe(PdfName.FlateDecode);
  });

  it("can be constructed from existing PdfDict", () => {
    const dict = PdfDict.of({
      Length: PdfNumber.of(100),
      Filter: PdfName.FlateDecode,
    });

    const stream = new PdfStream(dict, new Uint8Array(100));

    expect(stream.getNumber("Length")).toBe(100);
    expect(stream.data.length).toBe(100);
  });

  describe("inherits PdfDict behavior", () => {
    it("supports get/set", () => {
      const stream = new PdfStream();

      stream.set("Type", PdfName.of("XObject"));

      expect(stream.get("Type")).toBe(PdfName.of("XObject"));
    });

    it("supports typed getters", () => {
      const stream = PdfStream.fromDict({
        Length: PdfNumber.of(42),
      });

      expect(stream.getNumber("Length")).toBe(42);
    });
  });

  describe("data mutation", () => {
    it("can update data", () => {
      const stream = new PdfStream();
      const newData = new Uint8Array([10, 20, 30]);

      stream.data = newData;

      expect(stream.data).toBe(newData);
    });

    it("triggers mutation handler on data change", () => {
      const handler = vi.fn();

      const stream = new PdfStream();

      stream.setMutationHandler(handler);
      stream.data = new Uint8Array([1, 2, 3]);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it("triggers mutation handler on dict change", () => {
      const handler = vi.fn();

      const stream = new PdfStream();
      stream.setMutationHandler(handler);
      stream.set("Filter", PdfName.FlateDecode);

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe("static fromDict()", () => {
    it("creates stream from entries and data", () => {
      const data = new Uint8Array([1, 2, 3]);

      const stream = PdfStream.fromDict({ Length: PdfNumber.of(3) }, data);

      expect(stream.getNumber("Length")).toBe(3);
      expect(stream.data).toBe(data);
    });
  });
});
