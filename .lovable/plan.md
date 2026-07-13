## Goal
Track when yeast was pitched (date + time) on each batch, and show a live "days and hours since yeast added" counter in the fermenting section of the batch editor.

## Changes (all in `src/routes/index.tsx`)

1. **Extend `Batch` type**
   - Add `yeastPitchedAt?: string` — ISO datetime (`YYYY-MM-DDTHH:mm`) captured when yeast is first added.
   - Keep existing `startDate` (date-only) for backwards compatibility with saved batches.

2. **Batch editor — Fermentation section**
   - Add a `datetime-local` input labelled "Yeast pitched (date & time)" next to the existing Yeast / Ferment temp fields.
   - A "Set to now" quick button that fills the current local datetime.
   - Below the inputs, render an **Elapsed since pitch** readout: `X days, Y hours` (updates every minute via a `setInterval` + state tick). Hidden until `yeastPitchedAt` is set.

3. **Batch card (list view)**
   - When `yeastPitchedAt` is set and status is `fermenting`, show a small "Fermenting: Xd Yh" line under the existing "Started …" text so it's visible without opening the batch.

4. **Recipe → new batch flow**
   - Leave `yeastPitchedAt` empty on creation (user sets it when they actually pitch yeast). No change to recipes.

## Technical notes
- Elapsed calc: `const ms = Date.now() - new Date(yeastPitchedAt).getTime(); const days = Math.floor(ms / 86400000); const hours = Math.floor((ms % 86400000) / 3600000);`
- Live update: a `useEffect` with `setInterval(() => setTick(t => t+1), 60_000)` in the editor and card, cleared on unmount.
- No migration needed — field is optional; older batches simply won't show the counter until the user sets a pitch time.

No other files touched.