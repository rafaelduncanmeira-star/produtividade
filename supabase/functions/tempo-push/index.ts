import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

// Lembretes por Web Push (funcionam com o app fechado). Dois modos:
//  - CRON: chamado pelo agendador (pg_cron) com o header x-cron-secret. Varre as
//    inscrições devidas agora (manhã e/ou noite) e envia.
//  - TESTE: chamado pelo app com o JWT do usuário e body {test:true}; envia um
//    push imediato (formato da manhã) para os aparelhos daquele usuário.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Chave PÚBLICA do VAPID (pode ser exposta); a privada fica no tempo_secrets.
const VAPID_PUBLIC = "BDUzRx_CaRknUSzQ396lj-hSjrHKaDuEHrm2s-rHFnmZULNy6ftU2XMf8U-knx__wMAVz_GSHrr8Zek8QiYuja4";
const VAPID_SUBJECT = "mailto:rafaelduncanmeira@gmail.com";

interface SubRow {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  tz: string;
  kind?: string;
  local_date?: string;
}

const localDateISO = (tz: string): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
};

const clip = (s: string, n = 40): string => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// Lê as tarefas do usuário (mesma regra do selo) e resume o dia.
const analyze = (data: unknown, localDate: string) => {
  const tasks = (data as { tasks?: Array<{ title?: string; completed?: boolean; dueDate?: string }> })?.tasks;
  if (!Array.isArray(tasks)) return { pending: 0, firstTitle: "", todayTotal: 0, todayDone: 0 };
  const pendingList = tasks.filter((t) => t && !t.completed && !!t.dueDate && t.dueDate <= localDate);
  const todays = tasks.filter((t) => t && t.dueDate === localDate);
  return {
    pending: pendingList.length,
    firstTitle: (pendingList[0]?.title ?? "").trim(),
    todayTotal: todays.length,
    todayDone: todays.filter((t) => t.completed).length,
  };
};

type Analysis = ReturnType<typeof analyze>;

const morningPayload = (a: Analysis) => {
  const n = a.pending;
  const body = a.firstTitle
    ? `Você tem ${n} ${n === 1 ? "tarefa" : "tarefas"} hoje. Bora começar por “${clip(a.firstTitle)}”?`
    : `Você tem ${n} ${n === 1 ? "tarefa" : "tarefas"} para hoje. Bora começar?`;
  return { title: "Bom dia! ☀️", body, count: n, url: "./" };
};

const eveningPayload = (a: Analysis) => {
  const done = a.todayDone;
  const total = a.todayTotal;
  if (total === 0) {
    return { title: "Como foi seu dia? 🌙", body: "Toque para registrar como foi e planejar o de amanhã.", count: a.pending, url: "./" };
  }
  const left = total - done;
  const allDone = left <= 0;
  return {
    title: allDone ? "Mandou bem! 🎉" : "Como foi seu dia? 🌙",
    body: allDone
      ? `Você concluiu todas as ${total} ${total === 1 ? "tarefa" : "tarefas"} de hoje. 👏`
      : `Você concluiu ${done} de ${total}. ${left === 1 ? "Falta 1" : `Faltam ${left}`} — bora fechar o dia?`,
    count: a.pending,
    url: "./",
  };
};

const sendTo = async (admin: SupabaseClient, sub: SubRow, payload: unknown): Promise<boolean> => {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return true;
  } catch (e) {
    const status = (e as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) {
      await admin.from("push_subscriptions").delete().eq("id", sub.id); // expirada: remove
    } else {
      console.error("push send error", status, (e as Error).message);
    }
    return false;
  }
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Chave privada do VAPID (guardada no banco, fora do alcance público)
    const { data: secretRow } = await admin
      .from("tempo_secrets").select("value").eq("name", "vapid_private_key").maybeSingle();
    const vapidPrivate = secretRow?.value;
    if (!vapidPrivate) return json({ error: "VAPID não configurado." }, 503);
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, vapidPrivate);

    // Autorização do agendador via segredo compartilhado (header)
    const cronHeader = req.headers.get("x-cron-secret");
    const { data: cronRow } = await admin
      .from("tempo_secrets").select("value").eq("name", "cron_secret").maybeSingle();
    const isCron = !!cronHeader && !!cronRow?.value && cronHeader === cronRow.value;

    // ---- Modo TESTE: usuário logado dispara um push para si mesmo ----
    if (!isCron) {
      const authHeader = req.headers.get("Authorization") ?? "";
      const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "Não autenticado." }, 401);

      const { data: subs } = await admin
        .from("push_subscriptions").select("*").eq("user_id", user.id).or("enabled.eq.true,evening_enabled.eq.true");
      if (!subs || subs.length === 0) return json({ sent: 0, reason: "sem inscrições neste aparelho" });

      const { data: stateRow } = await admin
        .from("tempo_app_state").select("data").eq("user_id", user.id).maybeSingle();
      const a = analyze(stateRow?.data, localDateISO((subs[0] as SubRow).tz));
      const payload = { ...morningPayload(a), title: "🔔 Teste de lembrete" };
      const results = await Promise.all(subs.map((s) => sendTo(admin, s as SubRow, payload)));
      return json({ sent: results.filter(Boolean).length });
    }

    // ---- Modo CRON: varre as inscrições devidas agora (manhã/noite) ----
    const { data: due, error } = await admin.rpc("due_push_subscriptions");
    if (error) {
      console.error("rpc error", error.message);
      return json({ error: "rpc" }, 500);
    }
    const rows = (due ?? []) as SubRow[];
    let sent = 0;
    for (const sub of rows) {
      const localDate = sub.local_date ?? localDateISO(sub.tz);
      const { data: stateRow } = await admin
        .from("tempo_app_state").select("data").eq("user_id", sub.user_id).maybeSingle();
      const a = analyze(stateRow?.data, localDate);
      if (sub.kind === "evening") {
        if (await sendTo(admin, sub, eveningPayload(a))) sent++;
        await admin.from("push_subscriptions").update({ last_evening_on: localDate }).eq("id", sub.id);
      } else {
        // De manhã, só avisa se houver pendências (não enche o saco em dia livre).
        if (a.pending > 0 && await sendTo(admin, sub, morningPayload(a))) sent++;
        await admin.from("push_subscriptions").update({ last_sent_on: localDate }).eq("id", sub.id);
      }
    }
    return json({ processed: rows.length, sent });
  } catch (e) {
    console.error("tempo-push error", e);
    return json({ error: "Erro interno." }, 500);
  }
});
