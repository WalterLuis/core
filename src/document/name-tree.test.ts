import { PdfArray } from "#src/objects/pdf-array";
import { PdfDict } from "#src/objects/pdf-dict";
import type { PdfObject } from "#src/objects/pdf-object";
import { PdfRef } from "#src/objects/pdf-ref";
import { PdfString } from "#src/objects/pdf-string";
import { describe, expect, it } from "vitest";

import { buildNameTree, NameTree, type Resolver } from "./name-tree";

/**
 * Create a simple resolver that looks up objects in a map.
 */
function createResolver(objects: Map<string, PdfObject>): Resolver {
  return (ref: PdfRef) => {
    const key = `${ref.objectNumber}:${ref.generation}`;
    return objects.get(key) ?? null;
  };
}

describe("NameTree", () => {
  describe("flat tree (leaf only)", () => {
    it("returns null for empty tree", () => {
      const root = new PdfDict();
      root.set("Names", new PdfArray());

      const tree = new NameTree(root, () => null);

      expect(tree.get("anything")).toBeNull();
      expect(tree.has("anything")).toBe(false);
    });

    it("finds value by key", () => {
      const value = PdfDict.of({ Type: PdfString.fromString("Test") });
      const root = new PdfDict();
      root.set(
        "Names",
        new PdfArray([
          PdfString.fromString("apple"),
          value,
          PdfString.fromString("banana"),
          PdfDict.of({}),
        ]),
      );

      const tree = new NameTree(root, () => null);

      const result = tree.get("apple");
      expect(result).toBe(value);
    });

    it("returns null for missing key", () => {
      const root = new PdfDict();
      root.set("Names", new PdfArray([PdfString.fromString("apple"), PdfDict.of({})]));

      const tree = new NameTree(root, () => null);

      expect(tree.get("orange")).toBeNull();
    });

    it("resolves references", () => {
      const ref = PdfRef.of(10, 0);
      const resolved = PdfDict.of({ Resolved: PdfString.fromString("yes") });
      const objects = new Map<string, PdfObject>([["10:0", resolved]]);

      const root = new PdfDict();
      root.set("Names", new PdfArray([PdfString.fromString("doc"), ref]));

      const tree = new NameTree(root, createResolver(objects));

      const result = tree.get("doc");
      expect(result).toBe(resolved);
    });

    it("uses binary search for lookup", () => {
      // Create a sorted list of many entries
      const entries: PdfObject[] = [];

      for (let i = 0; i < 100; i++) {
        const key = `key${i.toString().padStart(3, "0")}`;
        entries.push(PdfString.fromString(key));
        entries.push(PdfDict.of({ index: PdfString.fromString(String(i)) }));
      }

      const root = new PdfDict();
      root.set("Names", new PdfArray(entries));

      const tree = new NameTree(root, () => null);

      // Should find items via binary search
      const result50 = tree.get("key050") as PdfDict;
      expect(result50.getString("index")?.asString()).toBe("50");

      const result0 = tree.get("key000") as PdfDict;
      expect(result0.getString("index")?.asString()).toBe("0");

      const result99 = tree.get("key099") as PdfDict;
      expect(result99.getString("index")?.asString()).toBe("99");

      // Should return null for missing
      expect(tree.get("key100")).toBeNull();
    });

    it("iterates all entries", () => {
      const root = new PdfDict();
      root.set(
        "Names",
        new PdfArray([
          PdfString.fromString("a"),
          PdfDict.of({}),
          PdfString.fromString("b"),
          PdfDict.of({}),
          PdfString.fromString("c"),
          PdfDict.of({}),
        ]),
      );

      const tree = new NameTree(root, () => null);

      const keys: string[] = [];
      for (const [key] of tree.entries()) {
        keys.push(key);
      }

      expect(keys).toEqual(["a", "b", "c"]);
    });

    it("caches getAll() result", () => {
      const root = new PdfDict();
      root.set("Names", new PdfArray([PdfString.fromString("x"), PdfDict.of({})]));

      const tree = new NameTree(root, () => null);

      expect(tree.isLoaded).toBe(false);

      const map1 = tree.getAll();
      expect(tree.isLoaded).toBe(true);

      const map2 = tree.getAll();
      expect(map1).toBe(map2); // Same instance

      tree.clearCache();
      expect(tree.isLoaded).toBe(false);
    });
  });

  describe("hierarchical tree", () => {
    it("navigates Kids to find leaf", () => {
      // Create a two-level tree:
      // Root: /Kids [ref1, ref2]
      // ref1 (kid1): /Names [a->v1, b->v2], /Limits [a, b]
      // ref2 (kid2): /Names [c->v3, d->v4], /Limits [c, d]

      const v1 = PdfDict.of({ value: PdfString.fromString("v1") });
      const v2 = PdfDict.of({ value: PdfString.fromString("v2") });
      const v3 = PdfDict.of({ value: PdfString.fromString("v3") });
      const v4 = PdfDict.of({ value: PdfString.fromString("v4") });

      const kid1 = new PdfDict();
      kid1.set(
        "Names",
        new PdfArray([PdfString.fromString("a"), v1, PdfString.fromString("b"), v2]),
      );
      kid1.set("Limits", new PdfArray([PdfString.fromString("a"), PdfString.fromString("b")]));

      const kid2 = new PdfDict();
      kid2.set(
        "Names",
        new PdfArray([PdfString.fromString("c"), v3, PdfString.fromString("d"), v4]),
      );
      kid2.set("Limits", new PdfArray([PdfString.fromString("c"), PdfString.fromString("d")]));

      const ref1 = PdfRef.of(1, 0);
      const ref2 = PdfRef.of(2, 0);

      const root = new PdfDict();
      root.set("Kids", new PdfArray([ref1, ref2]));

      const objects = new Map<string, PdfObject>([
        ["1:0", kid1],
        ["2:0", kid2],
      ]);

      const tree = new NameTree(root, createResolver(objects));

      expect(tree.get("a")).toBe(v1);
      expect(tree.get("b")).toBe(v2);
      expect(tree.get("c")).toBe(v3);
      expect(tree.get("d")).toBe(v4);
      expect(tree.get("e")).toBeNull();
    });

    it("uses binary search on Kids using Limits", () => {
      // Create tree with many kids to force binary search
      const kids: PdfRef[] = [];
      const objects = new Map<string, PdfObject>();

      for (let i = 0; i < 10; i++) {
        const ref = PdfRef.of(i + 1, 0);
        kids.push(ref);

        const minKey = `key${(i * 10).toString().padStart(3, "0")}`;
        const maxKey = `key${(i * 10 + 9).toString().padStart(3, "0")}`;

        const namesArray: PdfObject[] = [];
        for (let j = 0; j < 10; j++) {
          const k = i * 10 + j;
          namesArray.push(PdfString.fromString(`key${k.toString().padStart(3, "0")}`));
          namesArray.push(PdfDict.of({ idx: PdfString.fromString(String(k)) }));
        }

        const kid = new PdfDict();
        kid.set("Names", new PdfArray(namesArray));
        kid.set(
          "Limits",
          new PdfArray([PdfString.fromString(minKey), PdfString.fromString(maxKey)]),
        );

        objects.set(`${i + 1}:0`, kid);
      }

      const root = new PdfDict();
      root.set("Kids", new PdfArray(kids));

      const tree = new NameTree(root, createResolver(objects));

      // Should find via binary search
      const result55 = tree.get("key055") as PdfDict;
      expect(result55?.getString("idx")?.asString()).toBe("55");

      const result0 = tree.get("key000") as PdfDict;
      expect(result0?.getString("idx")?.asString()).toBe("0");

      const result99 = tree.get("key099") as PdfDict;
      expect(result99?.getString("idx")?.asString()).toBe("99");
    });

    it("iterates all entries from hierarchical tree", () => {
      const kid1 = new PdfDict();
      kid1.set("Names", new PdfArray([PdfString.fromString("a"), PdfDict.of({})]));

      const kid2 = new PdfDict();
      kid2.set("Names", new PdfArray([PdfString.fromString("b"), PdfDict.of({})]));

      const ref1 = PdfRef.of(1, 0);
      const ref2 = PdfRef.of(2, 0);

      const root = new PdfDict();
      root.set("Kids", new PdfArray([ref1, ref2]));

      const objects = new Map<string, PdfObject>([
        ["1:0", kid1],
        ["2:0", kid2],
      ]);

      const tree = new NameTree(root, createResolver(objects));

      const keys: string[] = [];
      for (const [key] of tree.entries()) {
        keys.push(key);
      }

      expect(keys).toEqual(["a", "b"]);
    });

    it("detects circular references", () => {
      // Create a tree that references itself
      const ref1 = PdfRef.of(1, 0);
      const root = new PdfDict();
      root.set("Kids", new PdfArray([ref1]));

      // Kid references itself
      const kid = new PdfDict();
      kid.set("Kids", new PdfArray([ref1]));
      kid.set("Limits", new PdfArray([PdfString.fromString("a"), PdfString.fromString("z")]));

      const objects = new Map<string, PdfObject>([["1:0", kid]]);

      const tree = new NameTree(root, createResolver(objects));

      // Should not hang - cycle detection should stop it
      const keys: string[] = [];
      for (const [key] of tree.entries()) {
        keys.push(key);
      }

      // Should complete without hanging
      expect(keys).toEqual([]);
    });
  });

  describe("has()", () => {
    it("returns true for existing key", () => {
      const root = new PdfDict();
      root.set("Names", new PdfArray([PdfString.fromString("test"), PdfDict.of({})]));

      const tree = new NameTree(root, () => null);

      expect(tree.has("test")).toBe(true);
    });

    it("returns false for missing key", () => {
      const root = new PdfDict();
      root.set("Names", new PdfArray([PdfString.fromString("test"), PdfDict.of({})]));

      const tree = new NameTree(root, () => null);

      expect(tree.has("missing")).toBe(false);
    });
  });
});

describe("buildNameTree", () => {
  it("creates empty tree for no entries", () => {
    const tree = buildNameTree([]);

    expect(tree.has("Names")).toBe(true);
    expect(tree.getArray("Names")?.length).toBe(0);
  });

  it("creates flat tree with sorted entries", () => {
    const ref1 = PdfRef.of(1, 0);
    const ref2 = PdfRef.of(2, 0);
    const ref3 = PdfRef.of(3, 0);

    // Pass unsorted - should be sorted in output
    const tree = buildNameTree([
      ["cherry", ref3],
      ["apple", ref1],
      ["banana", ref2],
    ]);

    const names = tree.getArray("Names")!;
    expect(names.length).toBe(6);

    // Should be sorted: apple, banana, cherry
    expect((names.at(0) as PdfString).asString()).toBe("apple");
    expect(names.at(1)).toBe(ref1);
    expect((names.at(2) as PdfString).asString()).toBe("banana");
    expect(names.at(3)).toBe(ref2);
    expect((names.at(4) as PdfString).asString()).toBe("cherry");
    expect(names.at(5)).toBe(ref3);
  });

  it("creates tree that can be read back", () => {
    const v1 = PdfDict.of({ id: PdfString.fromString("1") });
    const v2 = PdfDict.of({ id: PdfString.fromString("2") });

    const ref1 = PdfRef.of(1, 0);
    const ref2 = PdfRef.of(2, 0);

    const objects = new Map<string, PdfObject>([
      ["1:0", v1],
      ["2:0", v2],
    ]);

    const tree = buildNameTree([
      ["second", ref2],
      ["first", ref1],
    ]);

    const nameTree = new NameTree(tree, createResolver(objects));

    expect(nameTree.get("first")).toBe(v1);
    expect(nameTree.get("second")).toBe(v2);
    expect(nameTree.get("third")).toBeNull();
  });
});
