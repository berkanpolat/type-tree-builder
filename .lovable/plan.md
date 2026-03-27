
## Problem

In `App.tsx`, `PageTransition` receives `key={location.pathname}`. When a filter changes the URL path (e.g., `/firmalar/tedarikci` → `/firmalar/tedarikci/ambalaj-tedarikçisi`), React sees a new key, unmounts the entire `TekRehber` component, and shows the full-page `Suspense` fallback spinner before remounting.

The right-side `firmaLoading` spinner (line 794) already handles partial loading correctly — but it never gets a chance to show because the whole component is destroyed and recreated.

## Fix — `src/App.tsx`

Normalize the `PageTransition` key so that all sub-paths under `/firmalar` and `/tekpazar` share a single stable key:

```typescript
// Before PageTransition
const stableKey = location.pathname.startsWith("/firmalar")
  ? "/firmalar"
  : location.pathname.startsWith("/tekpazar")
  ? "/tekpazar"
  : location.pathname;
```

Then use `stableKey` instead of `location.pathname` as the `PageTransition` key:

```tsx
<PageTransition key={stableKey}>
```

This single change ensures:
- Filter path changes within `/firmalar/*` or `/tekpazar/*` do NOT unmount the page component
- Only the `firmaLoading` spinner in the right panel shows during filter fetches
- Other pages continue to get normal page transitions
- No changes needed in `TekRehber.tsx` — its `firmaLoading` state already handles partial loading

### File changes
- **`src/App.tsx`**: Add stable key derivation logic (~3 lines) before `PageTransition`, replace `key={location.pathname}` with `key={stableKey}`
