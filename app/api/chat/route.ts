// app/api/chat/route.ts
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";

/* =========================
   ENV & CLIENTS
========================= */

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1"
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
);

const MODEL = "qwen/qwen3-max-thinking";
const EMBEDDING_MODEL = "qwen/qwen3-embedding-8b:nitro";

/* =========================
   INPUT GATEWAY
========================= */

function sanitize(text: string) {
  return text.replace(/\u0000/g, "").replace(/\s+/g, " ").trim().slice(0, 4000);
}

/* =========================
   EMOTIONAL REASONING CORE
========================= */

function detectEmotionDeep(text: string) {
  const t = text.toLowerCase();

  let valence = 0;
  let arousal = 0;
  let risk = 0;

  if (/(bunuh diri|mati aja|gak mau hidup)/i.test(t)) risk = 1;
  if (/(putus asa|hampa|tidak berarti)/i.test(t)) valence = -0.9;
  if (/(cemas|panik|takut)/i.test(t)) arousal = 0.8;
  if (/(lelah|capek|kosong)/i.test(t)) valence = -0.6;
  if (/(marah|benci)/i.test(t)) arousal = 0.7;
  if (/(lega|tenang|syukur)/i.test(t)) valence = 0.6;

  const severity = Math.max(risk, Math.abs(valence) + arousal / 2);

  return { valence, arousal, risk, severity };
}

/* =========================
   INTENT & COMPLEXITY
========================= */

function intentProfile(text: string) {
  return {
    ambiguity: text.length < 20 ? 0.7 : 0.2,
    complexity: text.length > 200 ? 0.7 : 0.3
  };
}

/* =========================
   MEMORY RETRIEVAL (RAG)
========================= */

async function embed(text: string) {
  const res = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text
  });
  return res.data[0].embedding;
}

async function semanticSearch(userId: string, vector: number[]) {
  const { data } = await supabase.rpc("match_memory", {
    query_embedding: vector,
    match_threshold: 0.78,
    match_count: 6,
    uid: userId
  });
  return data || [];
}

async function fetchHistory(userId: string) {
  const { data } = await supabase
    .from("chats")
    .select("sender,message")
    .eq("user_id", userId)
    .order("timestamp", { ascending: false })
    .limit(20);
  return (data || []).reverse();
}

/* =========================
   PERSONALITY VECTOR ENGINE
========================= */

async function loadPersonality(userId: string) {
  const { data } = await supabase
    .from("user_personality")
    .select("vector")
    .eq("user_id", userId)
    .single();
  return data?.vector || null;
}

async function updatePersonality(userId: string, embedding: number[]) {
  await supabase.from("user_personality").upsert({
    user_id: userId,
    vector: embedding
  });
}

/* =========================
   ADAPTIVE ROUTING
========================= */

function chooseMode(e: any, intent: any) {
  if (e.risk > 0.8) return "crisis";
  if (e.severity > 0.7) return "therapeutic";
  if (intent.complexity > 0.6) return "deep";
  if (intent.ambiguity > 0.5) return "reflective";
  return "supportive";
}

/* =========================
   THERAPEUTIC STRATEGY
========================= */

function buildSystemPrompt(memory: string, personality: any, mode: string) {
  const base =
    "Kamu pendamping curhat manusiawi. Hangat, reflektif, empatik, tidak kaku. Fokus membantu memahami perasaan dan langkah kecil yang realistis.";

  const modeRule =
    mode === "crisis"
      ? "Prioritaskan keselamatan emosional dan dukungan nyata."
      : mode === "therapeutic"
      ? "Gunakan pendekatan refleksi emosi mendalam dan validasi pengalaman."
      : mode === "deep"
      ? "Gunakan eksplorasi bertahap dan insight psikologis ringan."
      : mode === "reflective"
      ? "Ajukan pertanyaan klarifikasi lembut."
      : "Balasan empatik ringkas.";

  return [
    {
      role: "system",
      content:
        `${base} ${modeRule}\n` +
        `Gunakan memori percakapan jika relevan.\n` +
        `MEMORY:\n${memory || "kosong"}`
    }
  ];
}

/* =========================
   MULTI STEP COGNITION LOOP
========================= */

async function cognition(userText: string, system: any[], temperature: number) {
  const step1 = await openai.chat.completions.create({
    model: MODEL,
    messages: [...system, { role: "user", content: userText }],
    temperature,
    max_tokens: 300
  });

  return step1.choices[0]?.message?.content || "";
}

/* =========================
   SAFETY VERIFICATION
========================= */

function safety(text: string) {
  if (/(cara bunuh diri|overdosis)/i.test(text)) return false;
  return true;
}

/* =========================
   MEMORY STORE
========================= */

async function storeMessage(userId: string, sender: string, message: string) {
  await supabase.from("chats").insert({
    user_id: userId,
    sender,
    message,
    timestamp: new Date().toISOString()
  });
}

/* =========================
   MAIN HANDLER
========================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userId = body.user_id || "anonymous";
    const raw = sanitize(body.message || "");

    const emotion = detectEmotionDeep(raw);
    const intent = intentProfile(raw);
    const mode = chooseMode(emotion, intent);

    const embedding = await embed(raw);
    const semanticMemory = await semanticSearch(userId, embedding);
    const history = await fetchHistory(userId);

    const memoryText = [
      ...history.map((h) => `${h.sender}: ${h.message}`),
      ...semanticMemory.map((m: any) => m.content)
    ].join("\n");

    const personality = await loadPersonality(userId);
    const temperature = 0.5 + emotion.arousal * 0.3;

    const system = buildSystemPrompt(memoryText, personality, mode);

    let response = await cognition(raw, system, temperature);

    if (!safety(response)) {
      response =
        "Aku peduli sama kamu. Kita fokus ke hal yang aman dulu. Mau cerita apa yang paling berat sekarang.";
    }

    await storeMessage(userId, "user", raw);
    await storeMessage(userId, "bot", response);

    await updatePersonality(userId, embedding);

    return NextResponse.json({
      reply: response,
      meta: {
        app: "piskoqo",
        mode,
        emotion: emotion.severity
      }
    });
  } catch {
    return NextResponse.json(
      { reply: "Ada kendala sistem. Coba lagi ya." },
      { status: 500 }
    );
  }
}
