# L.E.O — Livro Eletrônico de Ocorrência

Sistema de registro de ocorrências de segurança aeroportuária (AVSEC).

## Stack

- **Frontend:** React + TypeScript + Vite → deploy na Vercel
- **Backend:** Supabase (self-hosted via Easypanel/Hostinger VPS)
- **PDF/Relatórios:** html2pdf.js
- **Automação:** n8n Webhook

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz com:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key
VITE_N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/...
```

## Rodar Localmente

```bash
npm install
npm run dev
```

## Deploy

O deploy é feito automaticamente pela Vercel a cada push na branch principal.
