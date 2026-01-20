# 041: Garbage Collection on Full Save

## Problem Statement

When performing a **full (non-incremental) save**, orphan objects are written to the output PDF. An "orphan object" is any indirect object that exists in the registry but is not reachable from the document's root (catalog) or Info dictionary.

### Current Behavior

1. `ensureObjectsLoaded()` walks from Root/Info, loading all reachable objects into the registry
2. `writeComplete()` iterates `registry.entries()` and writes **all** objects (loaded + new)
3. Objects that were loaded but are no longer referenced still get written

### How Orphans Accumulate

```typescript
// Load PDF where page 1 has /Annots [5 0 R]
// Object 5 references appearance stream object 10
const pdf = await Pdf.open(bytes);

// Access page triggers loading objects 5 and 10 into registry
const page = pdf.getPage(0);

// Remove all annotations - deletes the reference to object 5
page.setAnnotations([]);

// Full save: objects 5 and 10 are still in registry.loaded
// They get written even though they're unreachable
const output = await pdf.save(); // Contains orphan objects 5 and 10
```

### Affected Scenarios

- Removing annotations (orphans: annotation dicts, appearance streams)
- Deleting pages (orphans: content streams, resources, annotations)
- Removing form fields (orphans: field dicts, widget annotations)
- Replacing fonts/images (orphans: old font/image objects)
- Any operation that removes an indirect reference

## Goals

1. **Full saves should not include orphan objects** - only reachable objects get written
2. **Incremental saves are unaffected** - they already work correctly (only write dirty/new objects)
3. **No performance regression for typical workflows** - garbage collection should be efficient
4. **Preserve backward compatibility** - existing API unchanged

## Non-Goals

- Object stream compression/reordering (separate optimization)
- Free list management for incremental saves
- Cross-reference stream optimization

## Proposed Solution

### Option A: Reachability-Based Writing (Recommended)

Change `writeComplete()` to only write objects reachable from Root and Info, rather than all registry entries.

```typescript
// Desired API usage (unchanged externally)
const output = await pdf.save(); // Only writes reachable objects
```

#### Implementation

1. **Collect reachable objects** - Walk from Root and Info, collecting all `PdfRef` encountered
2. **Write only reachable objects** - Filter `registry.entries()` to only include refs in the reachable set
3. **Handle circular references** - The walk already handles cycles via a visited set

```typescript
// In writeComplete():
function collectReachableRefs(registry: ObjectRegistry, root: PdfRef, info?: PdfRef): Set<PdfRef> {
  const reachable = new Set<PdfRef>();

  const walk = (obj: PdfObject | null): void => {
    if (obj === null) return;

    if (obj instanceof PdfRef) {
      if (reachable.has(obj)) return; // Already visited
      reachable.add(obj);

      const resolved = registry.resolve(obj);
      walk(resolved);
    } else if (obj instanceof PdfDict || obj instanceof PdfStream) {
      for (const [, value] of obj) {
        walk(value);
      }
    } else if (obj instanceof PdfArray) {
      for (const item of obj) {
        walk(item);
      }
    }
  };

  walk(root);
  if (info) walk(info);

  return reachable;
}
```

Then in `writeComplete()`:

```typescript
// Collect only reachable objects
const reachableRefs = collectReachableRefs(registry, options.root, options.info);

// Write only reachable objects
for (const [ref, obj] of registry.entries()) {
  if (!reachableRefs.has(ref)) continue; // Skip orphans
  // ... write object
}
```

#### Pros

- Clean, explicit garbage collection
- Easy to understand and debug
- No changes to registry structure

#### Cons

- Two walks (ensureObjectsLoaded + collectReachableRefs) - but they're fast for in-memory data
- Could be combined into one pass if performance matters

### Option B: Track Reachability in Registry

Modify `ObjectRegistry` to track which objects are reachable, updating on mutations.

#### Pros

- Single source of truth for reachability
- Could enable other optimizations

#### Cons

- Significant complexity increase
- Every mutation needs to update reachability
- Hard to maintain correctly

**Recommendation: Option A** - simpler, correct, and the performance cost of an extra walk is negligible.

## Detailed Design

### Changes to `pdf-writer.ts`

```typescript
/**
 * Collect all refs reachable from the document root.
 *
 * Walks the object graph starting from Root and Info,
 * returning the set of all PdfRef that are reachable.
 */
function collectReachableRefs(registry: ObjectRegistry, root: PdfRef, info?: PdfRef): Set<PdfRef> {
  const reachable = new Set<PdfRef>();

  const walk = (obj: PdfObject | null): void => {
    if (obj === null) return;

    if (obj instanceof PdfRef) {
      // Use string key for Set comparison (PdfRef instances may differ)
      const key = `${obj.objectNumber} ${obj.generation}`;
      if ([...reachable].some(r => `${r.objectNumber} ${r.generation}` === key)) {
        return;
      }
      reachable.add(obj);

      const resolved = registry.resolve(obj);
      walk(resolved);
    } else if (obj instanceof PdfDict) {
      for (const [, value] of obj) {
        walk(value);
      }
    } else if (obj instanceof PdfStream) {
      for (const [, value] of obj) {
        walk(value);
      }
    } else if (obj instanceof PdfArray) {
      for (const item of obj) {
        walk(item);
      }
    }
  };

  walk(root);
  if (info) walk(info);

  return reachable;
}

export function writeComplete(registry: ObjectRegistry, options: WriteOptions): WriteResult {
  // ... existing header writing ...

  // Collect only reachable objects (garbage collection)
  const reachableRefs = collectReachableRefs(registry, options.root, options.info);

  // Create a map for efficient lookup
  const reachableKeys = new Set([...reachableRefs].map(r => `${r.objectNumber} ${r.generation}`));

  // Write only reachable objects
  for (const [ref, obj] of registry.entries()) {
    const key = `${ref.objectNumber} ${ref.generation}`;
    if (!reachableKeys.has(key)) continue; // Skip orphans

    // ... existing object writing logic ...
  }

  // ... existing xref/trailer writing ...
}
```

### No Changes Required

- `ObjectRegistry` - no changes needed
- `ensureObjectsLoaded()` - can be kept or removed (collectReachableRefs does the same loading)
- `writeIncremental()` - works correctly, no changes needed
- Public API - no changes needed

### Optional Optimization: Combine Walks

Remove `ensureObjectsLoaded()` from `saveInternal()` since `collectReachableRefs()` does the same work:

```typescript
// In saveInternal():
// Remove: this.ensureObjectsLoaded();

// In writeComplete():
// collectReachableRefs already resolves refs, loading them into registry
```

## Test Plan

### Unit Tests

1. **Orphan from removed annotation**
   - Create PDF with annotation having appearance stream
   - Remove annotation
   - Full save should not include orphan objects
   - Verify by re-parsing and checking object count

2. **Orphan from removed page**
   - Create PDF with multiple pages
   - Remove a page
   - Full save should not include orphan page/content objects

3. **Circular references handled**
   - Create objects with circular refs (A → B → A)
   - Full save should not infinite loop or crash

4. **New objects included**
   - Create new annotation
   - Full save should include new objects

5. **Incremental save unaffected**
   - Remove annotation
   - Incremental save should still only write dirty objects
   - Original orphans preserved (incremental doesn't GC)

### Integration Tests

1. **Round-trip with modifications**
   - Load real PDF
   - Remove annotations
   - Save and reload
   - Verify saved size is smaller (no orphans)
   - Verify document still valid

## Migration / Breaking Changes

**None** - This is a bug fix. The API remains unchanged. Output PDFs will be smaller and cleaner.

## Open Questions

1. **Should we expose GC as an option?**
   - e.g., `pdf.save({ garbageCollect: false })` to preserve orphans
   - Probably not needed - why would you want orphans?

2. **Should we warn when orphans are removed?**
   - Could add to `registry.warnings` for debugging
   - Probably not - it's expected behavior

3. **Should `ensureObjectsLoaded()` be removed?**
   - It's now redundant with `collectReachableRefs()`
   - Could keep for explicit "warm up cache" use case
   - Recommend: keep but mark as optional optimization

## Implementation Checklist

- [ ] Add `collectReachableRefs()` function to `pdf-writer.ts`
- [ ] Modify `writeComplete()` to filter by reachable refs
- [ ] Add unit tests for orphan removal
- [ ] Add integration test with real PDF modification
- [ ] Consider removing redundant `ensureObjectsLoaded()` call
- [ ] Update architecture docs if needed
