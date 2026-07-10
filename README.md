# Outlet Maurizio Boutique

Gestionale React/Vite pronto per GitHub e Cloudflare Pages.

## Avvio locale

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Cloudflare Pages

- Framework preset: `Vite`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: lasciare vuota

Aggiungere in **Settings > Environment variables**:

- `VITE_ADMIN_USER`
- `VITE_ADMIN_PASSWORD`

## Nota importante

Questa è un'app statica: i dati vengono salvati nel `localStorage` del singolo browser/dispositivo. Non è un database condiviso e le credenziali Vite non costituiscono vera sicurezza server-side. Per più dispositivi, utenti o sicurezza reale serve un backend/database (ad esempio Cloudflare D1 + Workers o Supabase).
