# Tempo AI — Contexto para nova sessão

> Cole este texto como primeira mensagem da nova sessão do Claude Code.

## ⚙️ Antes de começar: escopo da sessão

Esta nova sessão **precisa ter acesso a DOIS repositórios** (ambos do dono `rafaelduncanmeira-star`):

- **`produtividade`** — onde o app é publicado (GitHub Pages). É o repositório principal desta sessão.
- **`Financas-AI`** — onde está hoje o **código-fonte** do app, na pasta `tempo-ai/`, branch `claude/time-productivity-app-discussion-a0hm5e`.

Se a sessão só tiver `produtividade` no escopo, o primeiro passo é copiar o código-fonte de `Financas-AI/tempo-ai/` para cá (a sessão anterior ficou presa exatamente por causa disso: só tinha acesso ao `Financas-AI` e tinha que pedir upload manual do build no `produtividade`).

## 🎯 Tarefa imediata desta sessão

1. **Trazer o código-fonte completo para o repositório `produtividade`** (copiar de `Financas-AI/tempo-ai/`). Hoje o `produtividade` só contém o build (`index.html`, `index.js` e um `index-D-H6PwKJ.js` antigo que pode ser apagado).
2. **Configurar deploy automático** (GitHub Actions): a cada `git push`, buildar com Vite e publicar no GitHub Pages. Isso elimina de vez o upload manual de arquivos que vinha sendo feito.
3. Depois disso, seguir com os pendentes (chave do Gemini + Kanban — ver abaixo).

## 📱 O que é o app

**Tempo AI** — app de gestão de tempo e produtividade, em português (pt-BR), mobile-first. Publicado em:
**https://rafaelduncanmeira-star.github.io/produtividade/**

Usado pelo dono (professor de medicina) e pelos alunos dele, cada um com login próprio.

## 🧱 Stack e build

- React 19 + TypeScript + Vite; Tailwind via CDN no `index.html`; ícones `lucide-react`; gráficos `recharts`; backend `@supabase/supabase-js`.
- `vite.config.ts`: `base: './'` e nomes de saída fixos (`entryFileNames: 'index.js'`, sem hash) — foi assim para facilitar o upload manual; com Actions isso pode ser mantido ou revertido para hash.
- Build: `npm install && npm run build` → gera `dist/index.html` + `dist/index.js`.
- O `index.html` referencia `./index.js`.

## 🗂️ Arquitetura do código (`tempo-ai/`)

- `App.tsx` — **porta de entrada/autenticação**: sessão Supabase, carrega o snapshot do usuário (nuvem → cache local → migração do localStorage antigo), salva na nuvem com debounce, tela de splash.
- `TempoApp.tsx` — **o app em si** (era o App original): recebe o estado inicial via props e reporta mudanças para cima; contém todo o estado, o timer Pomodoro e os handlers do Google.
- `types.ts` — modelo de dados. `utils.ts` — datas (sempre local, nunca `toISOString` para dia), streaks, formatação do timer, `playBeep`.
- `services/`: `supabaseClient.ts`, `cloudStore.ts` (snapshot JSON por usuário), `googleCalendar.ts`, `aiAssistant.ts`.
- `components/`: TodayView, TasksView, TaskItem, TaskForm, FocusView, PomodoroSettingsModal, HabitsView, HabitForm, PlannerView, TimeBlockForm, ReportsView, GoogleSettingsModal, AuthView, AIAssistant.

## ✅ Funcionalidades já prontas

- **Tarefas** com **Matriz de Eisenhower** (modos Lista e Matriz 2×2; urgência × importância).
- **Foco/Pomodoro**: timer baseado em timestamp (sobrevive a reload/troca de aba), atualiza `document.title`, registra sessões, incrementa pomodoros da tarefa vinculada, beep via Web Audio.
- **Hábitos**: grade semanal, sequência atual e recorde (streaks).
- **Planejamento**: blocos de tempo no dia, linha do "agora", e **sincronização automática bidirecional com o Google Agenda**.
- **Relatórios** (recharts) e **dashboard Hoje**.
- **Login multiusuário** (Supabase Auth, e-mail+senha, tela `AuthView`) e **sincronização na nuvem** (tabela `tempo_app_state`, um registro JSONB por usuário, RLS por usuário).
- **Assistente IA por voz**: ditado (Web Speech API, pt-BR, Chrome) + Gemini via Edge Function; devolve ações estruturadas (`create_task`, `create_block`, `create_habit`) que o usuário confirma antes de aplicar.

## ☁️ Supabase (projeto COMPARTILHADO — cuidado!)

Este projeto Supabase é o **mesmo** usado por outros apps do dono (Financas-AI, GeriClass, schema `anamnese`). **Não mexa nas tabelas de outros apps.** As tabelas do Tempo AI têm prefixo `tempo_`.

- Project ref: `ogwepzrwmywnubfgndpn`
- URL: `https://ogwepzrwmywnubfgndpn.supabase.co`
- Publishable key (pública, ok no front): `sb_publishable_BwBpKV4-yCeQhYVuJ52STw_8kBaFr7u`
- Organização: `dxefipflyxtldjoaojgm`
- Tabelas do Tempo AI:
  - `tempo_app_state` (`user_id` PK, `data` jsonb, `updated_at`) — RLS: cada usuário só lê/escreve o próprio.
  - `tempo_secrets` (`name` PK, `value`) — RLS ligada **sem policies**, ou seja, só a service role (Edge Functions) lê. Guarda a chave do Gemini.
- Edge Function: `tempo-ai` (deployada, `verify_jwt=true`) — autentica o usuário, lê `gemini_api_key` de `tempo_secrets`, chama `gemini-2.5-flash` e devolve `{reply, actions}`.
- Auth: cadastros habilitados; e-mails são auto-confirmados por um trigger existente (`geritools_auto_confirm_email`), então `signUp` pode não retornar sessão — o `AuthView` já faz fallback para `signInWithPassword`.

## 📅 Google Agenda (atenção ao mudar a URL)

- OAuth client-side via Google Identity Services. Cada usuário cola o próprio **OAuth Client ID** no app (Configurações → Google Agenda).
- A **origem JavaScript autorizada** do cliente OAuth do dono é `https://rafaelduncanmeira-star.github.io`. **Se a URL do app mudar, essa origem precisa ser atualizada no Google Cloud Console**, senão a conexão quebra.

## ⏳ Pendentes (continuar a partir daqui)

1. **Chave do Gemini**: o dono vai fornecer a chave da API (de https://aistudio.google.com/apikey). Inserir em `tempo_secrets`:
   ```sql
   insert into tempo_secrets (name, value) values ('gemini_api_key', '<CHAVE_AQUI>')
   on conflict (name) do update set value = excluded.value, updated_at = now();
   ```
   Sem isso a Edge Function responde HTTP 503 "A chave da IA ainda não foi configurada". Já testado: com a chave, o fluxo de login→IA funciona ponta a ponta.

2. **Kanban** (pedido pelo dono): adicionar um terceiro modo na tela Tarefas (**Lista | Matriz | Quadro**), com colunas **A fazer → Fazendo → Concluído**, mobile-first (mover com toque). Ideias combinadas: ao iniciar um Pomodoro numa tarefa, ela vai para "Fazendo" automaticamente; a IA poderia mover cards por voz ("terminei o relatório" → Concluído). Exige um campo de status na `Task` (compatível com o `completed` atual).

## 🔁 Fluxo de deploy desejado (a configurar)

Hoje: build local → upload manual de `index.js` no `produtividade`. **Meta**: GitHub Actions no `produtividade` que roda `npm ci && npm run build` e publica `dist/` no Pages a cada push na `main`. Lembrar de ajustar a fonte do Pages para "GitHub Actions" nas configurações do repo.
