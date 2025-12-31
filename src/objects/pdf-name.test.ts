import { describe, expect, it } from "vitest";
import { PdfName } from "./pdf-name";

describe("PdfName", () => {
  it("has type 'name'", () => {
    expect(PdfName.of("Type").type).toBe("name");
  });

  it("stores the name value without leading slash", () => {
    expect(PdfName.of("Type").value).toBe("Type");
    expect(PdfName.of("MediaBox").value).toBe("MediaBox");
  });

  it("returns same instance for same name (interning)", () => {
    const a = PdfName.of("Test");
    const b = PdfName.of("Test");

    expect(a).toBe(b);
  });

  it("returns different instances for different names", () => {
    const a = PdfName.of("Foo");
    const b = PdfName.of("Bar");

    expect(a).not.toBe(b);
  });

  it("pre-caches common PDF names", () => {
    expect(PdfName.Type.value).toBe("Type");
    expect(PdfName.Page.value).toBe("Page");
    expect(PdfName.Length.value).toBe("Length");
  });

  it("static names are interned with .of()", () => {
    expect(PdfName.of("Type")).toBe(PdfName.Type);
    expect(PdfName.of("Page")).toBe(PdfName.Page);
    expect(PdfName.of("Length")).toBe(PdfName.Length);
  });

  it("handles empty name", () => {
    const empty = PdfName.of("");

    expect(empty.value).toBe("");
    expect(PdfName.of("")).toBe(empty);
  });
});
