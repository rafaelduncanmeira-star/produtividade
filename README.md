# Tempo AI

App de gestão de tempo e produtividade (pt-BR), mobile-first.

🔗 **No ar:** https://rafaelduncanmeira-star.github.io/produtividade/

## Funcionalidades
- 📋 Tarefas com Matriz de Eisenhower (urgência × importância)
- ⏱️ Foco/Pomodoro (timer baseado em timestamp, sobrevive a reload)
- 🔁 Hábitos com sequências (streaks)
- 📅 Planejamento por blocos + sincronização com o Google Agenda
- 📊 Relatórios e dashboard
- 🔐 Login multiusuário e sincronização na nuvem (Supabase)
- 🤖 Assistente de IA por voz (Gemini via Edge Function)

## Stack
React 19 + TypeScript + Vite · Tailwind (CDN) · Supabase · `recharts` · `lucide-react`

## Desenvolvimento
```bash
npm install
npm run dev      # servidor local (porta 3001)
npm run build    # gera dist/
npm run preview  # serve o build localmente
```

## Deploy
Automático via **GitHub Actions** (`.github/workflows/deploy.yml`): cada push na `main`
builda com o Vite e publica no GitHub Pages. Requer a fonte do Pages configurada
como **"GitHub Actions"** (Settings → Pages → Build and deployment → Source).

## Documentação
Ver [`HANDOFF.md`](./HANDOFF.md) para arquitetura, dados do Supabase e pendências.
