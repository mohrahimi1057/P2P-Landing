# P2P Landing

Frontend MVP for a Bitcoin-native P2P lending marketplace.

The app models a flow where lenders publish fixed-rate BTC offers, borrowers lock Ordinals or BRC-20 collateral, and the interface tracks active loans, repayment amounts, and liquidation after a 24-hour grace period.

## Stack

- React 19
- Vite
- React Router
- Netlify

## Features

- Marketplace with open offers
- Lender and borrower offer creation forms
- Loan details view
- Dashboard for active loans
- Interest and repayment calculation helpers
- Netlify-ready SPA redirects

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Deploy

This project is configured for Netlify with:

- Build command: `npm run build`
- Publish directory: `dist`

Configuration lives in `netlify.toml`.
