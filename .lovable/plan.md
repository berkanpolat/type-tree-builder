

## Problem Analysis

### 1. "Ambalaj tedarikçisi" default filter issue
In the init effect (line 249-328), **Case 1** (turSlug present) sets `selectedFirmaTuru` but does NOT clear `firmaFilterState` when there are no query params or tipSlug. Since `firmaFilterState` uses `useSessionState`, it restores stale session data (e.g., previously selected "ambalaj tedarikçisi") from `sessionStorage`.

**Fix**: In Case 1, when there's no `tipSlug` and no query params, explicitly call `setFirmaFilterState(null)` — same as Case 3 already does.

### 2. Triple loading
Multiple state changes during initialization each independently trigger `fetchFirmalar`:
- `slugToId` loads (empty → populated) → init effect runs → sets `selectedFirmaTuru` → fetch #1
- `firmaFilterState` restored from session → fetch #2  
- `firmaTurleri` set → fetch #3 (it's in fetchFirmalar's dependency array)

**Fix**: Add an `initialized` state flag. Gate `fetchFirmalar` behind it. Set it to `true` only after the init effect completes all state updates. This collapses multiple renders into a single fetch.

### Changes — `src/pages/TekRehber.tsx`

1. Add `const [initialized, setInitialized] = useState(false);`
2. In the init effect (line 249), at the end (before or after `urlAppliedRef.current = true`), call `setInitialized(true)`
3. In Case 1 with turSlug but no tipSlug and no query params: add `setFirmaFilterState(null)`
4. Change the fetch trigger effect (line 587-589) to: `if (initialized && selectedFirmaTuru) fetchFirmalar()`  — add `initialized` to deps
5. Remove `firmaTurleri` from `fetchFirmalar`'s dependency array (it's only used for display name mapping inside, which can use a ref or be derived differently)

