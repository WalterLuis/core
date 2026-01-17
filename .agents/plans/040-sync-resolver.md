# Synchronous Object Resolution Spec

## Summary

Change the `ObjectRegistry.resolve()` method and related infrastructure from async to sync. This enables code patterns like:

```typescript
if (value instanceof PdfRef) {
  value = ctx.resolve(value);
}

if (value instanceof PdfDict) {
  doSomething(value);
}
```

Without making the containing method async.

## Current State

### Filters: Already Sync

The filter system is **already synchronous**:

```typescript
// src/filters/filter.ts
interface Filter {
  decode(data: Uint8Array, params?: PdfDict): Uint8Array;  // sync
  encode(data: Uint8Array, params?: PdfDict): Uint8Array;  // sync
}

// src/filters/filter-pipeline.ts
static decode(data: Uint8Array, filters: FilterSpec[]): Uint8Array;  // sync
static encode(data: Uint8Array, filters: FilterSpec[]): Uint8Array;  // sync

// src/objects/pdf-stream.ts
getDecodedData(): Uint8Array;  // sync
getEncodedData(): Uint8Array;  // sync
```

However, call sites often use `await` unnecessarily (which works but is misleading).

### Resolver: Async Interface, Sync Implementation

The `ObjectResolver` type is async:

```typescript
// src/document/object-registry.ts
type ObjectResolver = (ref: PdfRef) => Promise<PdfObject | null>;

async resolve(ref: PdfRef): Promise<PdfObject | null> {
  const existing = this.getObject(ref);
  if (existing !== null) return existing;

  if (this.resolver) {
    const obj = await this.resolver(ref);  // async call
    if (obj !== null) this.addLoaded(ref, obj);
    return obj;
  }
  return null;
}
```

But the actual resolver implementation in `DocumentParser.buildDocument()` is **synchronous**:

```typescript
// src/parser/document-parser.ts (line 573)
const getObject = (ref: PdfRef): PdfObject | null => {
  // ... entirely synchronous: xref lookup, parsing, decryption
  return obj;
};
```

The async wrapper exists for historical reasons (possibly anticipating streaming/lazy file I/O), but all current operations are synchronous in-memory operations.

### Call Site Count

- ~60 `await ctx.resolve(...)` calls across 15 source files
- ~96 `instanceof PdfRef` checks that often precede resolution
- Many methods are async solely because they call `resolve()`

## Proposed Changes

### 1. Change `ObjectResolver` Type to Sync

```typescript
// src/document/object-registry.ts
export type ObjectResolver = (ref: PdfRef) => PdfObject | null; // was Promise<...>
```

### 2. Change `ObjectRegistry.resolve()` to Sync

```typescript
// src/document/object-registry.ts
resolve(ref: PdfRef): PdfObject | null {  // was async, returned Promise
  const existing = this.getObject(ref);
  if (existing !== null) return existing;

  if (this.resolver) {
    const obj = this.resolver(ref);  // sync call
    if (obj !== null) this.addLoaded(ref, obj);
    return obj;
  }
  return null;
}
```

### 3. Update `PDFContext.resolve()` to Sync

```typescript
// src/api/pdf-context.ts
resolve(ref: PdfRef): PdfObject | null {  // was async
  return this.registry.resolve(ref);
}
```

### 4. Remove Unnecessary `await` from Call Sites

Transform ~60 call sites from:

```typescript
const resolved = await ctx.resolve(ref);
```

To:

```typescript
const resolved = ctx.resolve(ref);
```

### 5. Remove `async` from Methods That Only Awaited `resolve()`

Many methods are async only because they called `resolve()`. These can become sync:

```typescript
// Before
async getResources(): Promise<PdfDict | null> {
  const resources = await this.ctx.resolve(this.dict.getRef("Resources"));
  return resources instanceof PdfDict ? resources : null;
}

// After
getResources(): PdfDict | null {
  const resources = this.ctx.resolve(this.dict.getRef("Resources"));
  return resources instanceof PdfDict ? resources : null;
}
```

### 6. Update `NameTree` Resolver Type

```typescript
// src/document/name-tree.ts
export type Resolver = (ref: PdfRef) => PdfObject | null; // was Promise<...>
```

### 7. Remove Unnecessary `await` from Filter Calls

While filters are already sync, many call sites use `await`:

```typescript
// Before (works but misleading)
const decoded = await stream.getDecodedData();

// After (explicit about sync nature)
const decoded = stream.getDecodedData();
```

## Files to Modify

### Core Infrastructure

| File                              | Changes                                                     |
| --------------------------------- | ----------------------------------------------------------- |
| `src/document/object-registry.ts` | Change `ObjectResolver` type and `resolve()` method to sync |
| `src/api/pdf-context.ts`          | Change `resolve()` to sync                                  |
| `src/document/name-tree.ts`       | Change `Resolver` type and methods to sync                  |

### API Layer (~15 files)

| File                         | Estimated Changes                                   |
| ---------------------------- | --------------------------------------------------- |
| `src/api/pdf.ts`             | ~10 await removals, several methods can become sync |
| `src/api/pdf-page.ts`        | ~15 await removals, most methods can become sync    |
| `src/api/pdf-catalog.ts`     | ~5 await removals                                   |
| `src/api/pdf-attachments.ts` | ~5 await removals                                   |
| `src/api/pdf-context.ts`     | ~2 changes                                          |

### Document Layer

| File                                      | Estimated Changes |
| ----------------------------------------- | ----------------- |
| `src/document/forms/acro-form.ts`         | ~8 await removals |
| `src/document/forms/field-tree.ts`        | ~5 await removals |
| `src/document/forms/fields/base.ts`       | ~3 await removals |
| `src/document/forms/form-flattener.ts`    | ~5 await removals |
| `src/document/forms/widget-annotation.ts` | ~3 await removals |
| `src/document/object-copier.ts`           | ~5 await removals |

### Other

| File                                | Estimated Changes |
| ----------------------------------- | ----------------- |
| `src/layers/layers.ts`              | ~6 await removals |
| `src/annotations/*.ts`              | ~5 await removals |
| `src/signatures/ltv/dss-builder.ts` | ~3 await removals |

## Migration Strategy

### Phase 1: Core Changes

1. Update `ObjectResolver` type to sync
2. Update `ObjectRegistry.resolve()` to sync
3. Update `PDFContext.resolve()` to sync
4. Update `NameTree` resolver

### Phase 2: Call Site Updates (can be parallelized)

For each file:

1. Remove `await` from `resolve()` calls
2. Remove `await` from filter calls (optional but good cleanup)
3. Check if method can become sync (no other awaits)
4. If yes, change signature and update callers

### Phase 3: Test Updates

1. Update tests to use sync patterns
2. Remove unnecessary `await` in test code

## Benefits

1. **Simpler code patterns** - No async/await gymnastics for simple type checks
2. **Better TypeScript inference** - Sync narrowing works immediately
3. **Performance** - Eliminates microtask queue overhead from Promise wrapping
4. **Consistency** - Filters and resolution both sync; easier mental model
5. **Enables sync APIs** - Can offer sync versions of common operations

## Risks and Mitigations

### Risk: Future Streaming Support

If we later want streaming/lazy file I/O, resolution would need to be async.

**Mitigation**: We can re-introduce async at the `PDF.load()` boundary. The resolver callback could do eager loading of the entire xref at load time, keeping `resolve()` sync. Alternatively, provide both sync and async APIs.

### Risk: Large Refactor

~60+ call sites need updating.

**Mitigation**: This is mechanical and can be done systematically. TypeScript will catch any missed sites (type errors from awaiting non-Promises or assigning `PdfObject | null` where `Promise<...>` was expected).

## Non-Goals

- Changing the public `PDF.load()` API (remains async for file I/O)
- Changing the save/write pipeline (has legitimate async needs)
- Making everything sync (some operations genuinely need async)

## Success Criteria

1. All tests pass
2. No `async` methods that only awaited `resolve()`
3. TypeScript compiles without errors
4. `resolve()` calls no longer use `await`
