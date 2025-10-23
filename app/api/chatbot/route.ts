// app/api/chatbot/route.ts
import { NextResponse } from "next/server";
import { ChatGroq } from "@langchain/groq";
import { downloadNdjson } from "../../../lib/supabase";

const API_KEY = process.env.GROQ_API_KEY!;
const MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const llm = new ChatGroq({
  apiKey: API_KEY,
  model: MODEL,
  temperature: 0.2, // más directo y determinista
});

// Convierte una línea del NDJSON a texto legible, priorizando campos comunes.
// Soporta { emisor, speaker, text, mensaje }.
function lineToString(l: any): string {
  const speaker = l?.emisor ?? l?.speaker ?? "";
  const textRaw = l?.text ?? l?.mensaje;
  const text =
    typeof textRaw === "string" ? textRaw : JSON.stringify(textRaw ?? l);
  return (speaker ? `[${speaker}] ` : "") + text;
}

// Heurística simple: busca líneas que contengan el query; si no hay matches,
// usa las primeras líneas como fallback.
function naiveSearch(lines: any[], query: string, max = 12): string {
  const q = query.toLowerCase();
  const hits = lines.filter((l) => {
    const t = (l?.text ?? l?.mensaje ?? "").toString().toLowerCase();
    return t.includes(q);
  });
  const pick = (hits.length ? hits : lines).slice(0, max);
  return pick.map(lineToString).join("\n");
}

// Comportamiento “experto en transcripciones” 
const BEHAVIOR = `
Sos un analista experto en transcripciones (.ndjson) de llamadas/reuniones.
Objetivo: responder con precisión y seguridad sobre el contenido de la transcripción provista.
Reglas:
- Tono directo y afirmativo; evitá “parece”, “podría”, “posiblemente”.
- Si la información NO está en los extractos, respondé exactamente: "No está en la transcripción".
- Priorizá hechos. Respondé breve (2–5 líneas). Usá viñetas si ayuda.
- No inventes información ni uses contexto externo.
`.trim();

export async function POST(req: Request) {
  try {
    if (!API_KEY) {
      return NextResponse.json(
        { error: "Falta GROQ_API_KEY en .env.local" },
        { status: 500 }
      );
    }

    const body = await req.json();
    const message: string = body?.message;
    const transcriptPath: string | undefined = body?.transcriptPath;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Falta 'message' (string)" }, { status: 400 });
    }

    // Armar contexto desde el NDJSON (si se pasó transcriptPath)
    let context = "";
    if (transcriptPath) {
      try {
        console.log("📥 Descargando transcripción:", transcriptPath);
        const lines = await downloadNdjson(transcriptPath);
        console.log("📊 Líneas encontradas:", lines.length);
        context = naiveSearch(lines, message);
        console.log("🔍 Contexto generado:", context ? context.substring(0, 200) + "..." : "Sin contexto");
      } catch (e: any) {
        console.warn("❌ No pude leer NDJSON:", e?.message || e);
        console.warn("📋 Transcripción path:", transcriptPath);
        // seguimos sin contexto
      }
    } else {
      console.log("⚠️ No se proporcionó transcriptPath");
    }

    const system = [
      BEHAVIOR,
      context
        ? "A continuación tenés extractos de la transcripción. Úsalos como única fuente de verdad."
        : "No hay extractos disponibles para esta consulta. Respondé sin inventar.",
      context ? `EXTRACTOS:\n${context}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const aiMsg = await llm.invoke([
      { role: "system", content: system },
      { role: "user", content: message },
    ]);

    const reply =
      typeof aiMsg.content === "string"
        ? aiMsg.content
        : JSON.stringify(aiMsg.content);

    return NextResponse.json({ reply });
  } catch (err: any) {
    const msg =
      err?.error?.message ||
      err?.message ||
      "Error del servidor llamando al modelo";
    console.error("Groq error:", err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}