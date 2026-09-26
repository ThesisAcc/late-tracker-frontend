# LateTrack

Browser-only frontend for tracking worker lateness. Managers import an Excel workbook of monthly late-minute totals, review team performance, and switch to a read-only worker view. Data never leaves the browser.

The backend is still under development. The app runs entirely in the browser until the API exists.

## Features

- Manager dashboard with per-month team totals, late-worker counts, averages, a 12-month line trend, and a sortable/searchable worker table
- Worker breakdown in a modal, opened from any row in the manager table and closed with the Escape key, the close icon, or a click outside it
- Read-only worker view with a worker selector and personal monthly records
- Browser-side `.xlsx` import with per-sheet preview, validation errors, and warnings
- Sample workbook action that runs a mock import through the real parser, for demos and testing without a file
- Two-sheet downloadable template (workers plus instructions)
- Persistence in `localStorage`, with a fictional demo dataset on first load
- `Demo data` badge in the header while sample records are shown
- Responsive layout, keyboard navigation, and reduced-motion support

No backend, no account, no network requests at runtime.

## Demo mode

On first load the app shows a fictional 14-worker roster with `DEMO-1xxx` IDs and late minutes for January to September 2026. October to December are left at zero so the 12-month totals have room to grow. A `Demo data` badge in the header marks the records as sample data, and it stays visible at every screen width.

The badge is the only demo indicator. The header already carries **Import Excel**, so no duplicate import action is shown above the dashboard.

Choose **Use sample workbook** in the import dialog to run a complete demo import without a file. It builds an in-memory workbook from mock rows, parses it with the same `parseSheetRows` used for real uploads, and shows the usual preview, warnings, and confirmation step. The sample roster differs from the demo roster, so month totals, late-worker counts, the trend, and the worker table all visibly change after the import. **Restore demo** returns to the sample dataset.

## Data source

Components never talk to storage or a network directly. `useLateTrackerData` depends on the `AttendanceRepository` interface in `src/lib/dataSource.ts`:

| Method | Purpose |
| --- | --- |
| `load()` | Resolve the current `TrackerData` |
| `applyImport(selection)` | Store a validated workbook and resolve the result |
| `restoreDemo()` | Reset to the fictional dataset |

`src/lib/localStorageRepository.ts` is the only implementation today. When the backend is ready, add a second implementation with the same three methods and return it from `getActiveRepository()`; no component, dashboard, or dialog changes are required. `TrackerSource` already includes `server`, and the notice and header badge have copy for it.

Once records come from a file or a server, a notice above the dashboard names the file and sheet and offers **Restore demo** and **Replace data**. The notice is not rendered for demo data, because the header already carries the import action.

Each method resolves `{ data, persisted }`. A `persisted: false` result means the change is in memory for the session only, which the app reports in a dismissible alert instead of failing silently.

## Requirements

Node.js 20.19+ or 22.12+ (verified on 24.16.0) and npm.

## Getting started

```bash
npm install
npm run dev
```

The dev server prints a local URL. Open it in a browser.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint over the project |
| `npm run typecheck` | Run TypeScript project checks |
| `npm test` | Run the Vitest suite once |
| `npm run test:watch` | Run Vitest in watch mode |

## Workbook format

The importer looks for a header row anywhere in the sheet, then maps columns by name. Matching is case-insensitive and ignores extra whitespace.

| Accepted header | Aliases | Required |
| --- | --- | --- |
| Employee ID | `EmployeeID`, `ID`, `#`, `No.`, `No` | Yes |
| Last Name | `LastName`, `Name 1` | Yes |
| First Name | `FirstName`, `Name 2` | Yes |
| Middle Name | `MiddleName`, `Name 3` | No |
| January … December | `Jan` … `Dec`, month keys | At least one |

Values are read as follows:

- Month cells hold whole minutes. Negative, fractional, or non-numeric values are rejected.
- Blank month cells count as zero. Months absent from the header also count as zero and raise a warning.
- Employee IDs must be unique, compared case-insensitively.
- A numeric employee ID is accepted and stored as text.

Download the template from the import dialog to get the exact layout.

## Limits

- `.xlsx` only. Legacy `.xls` and CSV are not supported.
- 5 MB maximum file size.
- 5,000 rows and 100 columns maximum per sheet.
- Every sheet in the workbook is parsed; the import dialog lets you choose which one to apply.

## Import behaviour

A sheet with validation errors cannot be applied, and the dialog lists every error with its row and column. A sheet with only warnings can be applied. Applying a selection replaces the current dataset in `localStorage` under `latetrack-data-v1`; **Restore demo** returns to the fictional demo data.

**Use sample workbook** is a shortcut, not a separate code path: `createSampleWorkbook` in `src/lib/sampleWorkbook.ts` builds an in-memory workbook from mock rows, and it goes through `parseSheetRows`, preview, and confirmation exactly like an uploaded file. The sample uses `SMP-2xxx` IDs, omits October to December, and therefore produces a missing-months warning.

## Project layout

## Dialogs

Both dialogs use the native `<dialog>` element, so they render in the top layer, trap focus, close on the Escape key, and close on a click outside the surface. Each captures the focused element when it opens and returns focus there on close, for all three close paths.

`WorkerDetailDialog` shows one worker's 12-month totals from the manager table. `ImportDialog` handles upload, sample workbook, preview, and confirmation.

```
src/
  components/     shared presentational components
  features/
    import/       import dialog: upload, sample workbook, preview, validation, confirmation
    manager/      manager dashboard and worker detail dialog
    worker/       worker dashboard
  hooks/          data state, loading and warning state
  lib/            types, month definitions, calculations, storage, Excel I/O, data source repository
  test/           Vitest setup
```

## Storage

`src/lib/storage.ts` validates everything read back from `localStorage`. Invalid, partial, or corrupted data is discarded in favour of the demo dataset, so a bad write cannot break the app on the next load. If storage is unavailable (private mode, blocked cookies), the app still works for the session and shows a warning.

## Testing

Tests cover month arithmetic and summary aggregation, storage round-trips and corruption fallback, workbook parsing and validation rules, the data source repository including its save-failure path, the generated sample workbook, and the app shell including role switching, search filtering, empty states, demo mode, both import paths, and the worker detail dialog closing on the Escape key with focus returned to its trigger.

```bash
npm test
```

## Notes

- Excel reading uses `read-excel-file`; template writing uses `write-excel-file`. Both load on demand, so the initial bundle stays small.
- Data is stored per browser. Clearing site data removes imported records.
