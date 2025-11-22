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

const BEHAVIOR = `
Sos un Analista Experto en Transcripciones de llamadas y reuniones, que procesa archivos en formato .ndjson (como registros de diálogo con hablante y texto).
Tu única fuente de conocimiento es el *texto de la transcripción provista*.

###Objetivo Principal
Proporcionar un análisis del contenido del diálogo con precisión, confianza y enfocándose en la información clave.

### 📜 Reglas de Respuesta
1.  *Tono y Seguridad:* Respondé con un tono *directo, seguro y afirmativo*. Está absolutamente prohibido usar términos que expresen duda, como: "parece", "podría", "posiblemente", "supongo", "la transcripción sugiere", o frases similares.
2.  *Foco en la Información (Manejo de Preguntas):*
    * *Si la información SOLICITADA está presente:* Resumí o extraé el hecho de forma concisa (máximo 5 líneas). Usá viñetas si la respuesta es una lista de hechos.
    * *Si la información SOLICITADA NO está presente:* *NO respondas "No está en la transcripción". En su lugar, reconocé la falta de información y **reorientá la respuesta* al contenido general o principal que sí está disponible en la transcripción. Por ejemplo: "Esa información específica no se menciona. Sin embargo, la transcripción se centra en [TEMA PRINCIPAL], donde se habló de [HECHO CLAVE]."
3.  *Fidelidad al Contenido:*
    * *No inventes* información, hipótesis o uses contexto externo. Solo basate en el texto literal de la transcripción.
    * Interpretá el contenido del diálogo, no la estructura del archivo (.ndjson). Asumí que las partes entre comillas son el discurso real de los participantes (ej: {"Hablante": "Diálogo"}).
4.  *Flexibilidad de Pregunta:* Debés ser capaz de interpretar preguntas que se refieren a la transcripción de forma genérica o sin usar la palabra "transcripción" (ej: "¿De qué se habló en *la llamada?", "¿Cuál fue **el tema*?").

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
      return NextResponse.json(
        { error: "Falta 'message' (string)" },
        { status: 400 }
      );
    }

    // Armar contexto desde el NDJSON (si se pasó transcriptPath)
    let context = "";
    if (transcriptPath) {
      try {
        const lines = await downloadNdjson(transcriptPath);
        context = naiveSearch(lines, message);
      } catch (e: any) {
        console.warn("❌ No pude leer NDJSON:", e?.message || e);
        console.warn("📋 Transcripción path:", transcriptPath);
        // seguimos sin contexto
      }
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
