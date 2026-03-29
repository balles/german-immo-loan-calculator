# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

## [1.1.1] — 2026-03-29

### Fixed
- Added `environment: production` to release workflow job to access GitHub environment secrets (Vercel deploy hook)

## [1.1.0] — 2026-03-28

### Added
- **Szenariovergleich tab** — compare the current financing plan against saved or imported scenarios
  - Save a snapshot of the current scenario with a custom name
  - Load additional scenarios from exported JSON files
  - Toggle scenario visibility via chips; remove scenarios individually
  - Metrics table with one column per scenario; comparison columns show percentage change vs. current (green = improvement, red = regression)
  - Cost breakdown donut chart per scenario (Kaufpreis, Kaufnebenkosten, Sanierung, Zinskosten, KfW-Zuschuss)
  - Restschuldverlauf line chart across all visible scenarios
- **Restschuldverlauf chart on Auswertung page** — line chart showing remaining debt per loan and total over time
- **Donut chart for Aufschlüsselung Gesamtkosten** on the Auswertung page, replacing the horizontal bar breakdown
- CHANGELOG.md with automated stamping on release

### Changed
- State version bumped to 2; existing saved state migrates automatically (`comparisonScenarios: []` added)

---

## [1.0.2] — 2026-03-28

### Fixed
- Corrected `version.ts` path in the GitHub Actions release workflow

---

## [1.0.1] — 2026-03-28

### Added
- GitHub Actions release workflow: automatic semver bump and git tag on every merge to `main`
- Vercel deploy hook integration: production deploys triggered only after version bump commit
- `.vercel` added to `.gitignore`

---

## [1.0.0] — 2026-03-27

### Added
- Initial release of the Immobilien-Finanzierungsrechner
- **Eingabe tab**: property details, equity, and unlimited loans (annuity and KfW 261)
- **Auswertung tab**: KPI cards, cost breakdown, and amortization charts
- Annuity loans with fixed-rate period, follow-up rate, and Sondertilgungen (scheduled extra payments by year, capped by % of loan amount)
- KfW 261 loans with efficiency level, repayment grant, and fixed Laufzeit
- Anschlussfinanzierung: link a follow-up loan to an existing one; sync remaining debt automatically
- Financing coverage banner (gap / surplus / covered)
- JSON export and import with versioned state and Zod validation
- State persistence in `localStorage` with automatic migration
- Plan name field used as export filename slug
- Favicon (house SVG)
