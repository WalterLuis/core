import { describe, expect, it } from "vitest";
import {
  isPdfArray,
  isPdfBool,
  isPdfDict,
  isPdfName,
  isPdfNull,
  isPdfNumber,
  isPdfRef,
  isPdfStream,
  isPdfString,
  type PdfObject,
} from "./object";
import { PdfArray } from "./pdf-array";
import { PdfBool } from "./pdf-bool";
import { PdfDict } from "./pdf-dict";
import { PdfName } from "./pdf-name";
import { PdfNull } from "./pdf-null";
import { PdfNumber } from "./pdf-number";
import { PdfRef } from "./pdf-ref";
import { PdfStream } from "./pdf-stream";
import { PdfString } from "./pdf-string";

describe("PdfObject type guards", () => {
  const objects: PdfObject[] = [
    PdfNull.instance,
    PdfBool.TRUE,
    PdfNumber.of(42),
    PdfName.of("Test"),
    PdfString.fromString("hello"),
    PdfRef.of(1, 0),
    new PdfArray(),
    new PdfDict(),
    new PdfStream(),
  ];

  it("isPdfNull identifies null", () => {
    expect(isPdfNull(PdfNull.instance)).toBe(true);

    for (const obj of objects.filter(o => o.type !== "null")) {
      expect(isPdfNull(obj)).toBe(false);
    }
  });

  it("isPdfBool identifies booleans", () => {
    expect(isPdfBool(PdfBool.TRUE)).toBe(true);
    expect(isPdfBool(PdfBool.FALSE)).toBe(true);

    for (const obj of objects.filter(o => o.type !== "bool")) {
      expect(isPdfBool(obj)).toBe(false);
    }
  });

  it("isPdfNumber identifies numbers", () => {
    expect(isPdfNumber(PdfNumber.of(42))).toBe(true);
    expect(isPdfNumber(PdfNumber.of(-3.14))).toBe(true);

    for (const obj of objects.filter(o => o.type !== "number")) {
      expect(isPdfNumber(obj)).toBe(false);
    }
  });

  it("isPdfName identifies names", () => {
    expect(isPdfName(PdfName.of("Test"))).toBe(true);
    expect(isPdfName(PdfName.Type)).toBe(true);

    for (const obj of objects.filter(o => o.type !== "name")) {
      expect(isPdfName(obj)).toBe(false);
    }
  });

  it("isPdfString identifies strings", () => {
    expect(isPdfString(PdfString.fromString("test"))).toBe(true);
    expect(isPdfString(PdfString.fromHex("4142"))).toBe(true);

    for (const obj of objects.filter(o => o.type !== "string")) {
      expect(isPdfString(obj)).toBe(false);
    }
  });

  it("isPdfRef identifies refs", () => {
    expect(isPdfRef(PdfRef.of(1, 0))).toBe(true);

    for (const obj of objects.filter(o => o.type !== "ref")) {
      expect(isPdfRef(obj)).toBe(false);
    }
  });

  it("isPdfArray identifies arrays", () => {
    expect(isPdfArray(new PdfArray())).toBe(true);

    for (const obj of objects.filter(o => o.type !== "array")) {
      expect(isPdfArray(obj)).toBe(false);
    }
  });

  it("isPdfDict identifies dicts (but not streams)", () => {
    expect(isPdfDict(new PdfDict())).toBe(true);
    expect(isPdfDict(new PdfStream())).toBe(false); // streams have type "stream"

    for (const obj of objects.filter(o => o.type !== "dict")) {
      expect(isPdfDict(obj)).toBe(false);
    }
  });

  it("isPdfStream identifies streams", () => {
    expect(isPdfStream(new PdfStream())).toBe(true);
    expect(isPdfStream(new PdfDict())).toBe(false);

    for (const obj of objects.filter(o => o.type !== "stream")) {
      expect(isPdfStream(obj)).toBe(false);
    }
  });

  it("all objects have a type field", () => {
    for (const obj of objects) {
      expect(typeof obj.type).toBe("string");
    }
  });
});
