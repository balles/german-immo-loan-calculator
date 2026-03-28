# Immobilien-Finanzierungsrechner

A client-side web app for planning real estate financing (purchase + renovation).

## Features

- Property cost breakdown (purchase price, side costs, renovation)
- Multiple loans: annuity and KfW 261
- Anschlussfinanzierung with automatic Restschuld handoff
- Scheduled Sondertilgungen per year
- Amortization charts (monthly breakdown + yearly total burden)
- JSON import/export for saving and comparing scenarios
- Persists state in localStorage

## Tech Stack

- React + TypeScript (Vite)
- Tailwind CSS
- Recharts

## Development

```bash
npm install
npm run dev            # localhost only
npm run dev -- --host  # expose on local network
npm run build
```
