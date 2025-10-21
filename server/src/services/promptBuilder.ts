import { RetrievedChunk } from "./nomicClient.js";

export type PromptReference = {
  label: string;
  model: string;
  document: string;
  pages?: string;
};

export type PromptPayload = {
  prompt: string;
  references: PromptReference[];
};

export function buildPrompt(question: string, contexts: RetrievedChunk[]): PromptPayload {
  const cleanedContext = contexts.map((chunk, index) => {
    const modelName = chunk.metadata.model_name ?? chunk.metadata.model_slug ?? "Manual Tesla";
    const documentTitle = chunk.metadata.document_title ?? modelName;
    const pages = computePageRange(chunk.metadata.page_start, chunk.metadata.page_end);
    const label = `${documentTitle}${pages ? ` (${pages})` : ""}`;

    return {
      index: index + 1,
      label,
      text: chunk.text.trim(),
      reference: {
        label: `R${index + 1}`,
        model: modelName,
        document: documentTitle,
        pages,
      },
    };
  });

  const contextBlock = cleanedContext
    .map((item) => `(${item.reference.label}) ${item.label}\n${item.text}`)
    .join("\n\n");

  const prompt = [
    "Eres un asistente de soporte de Tesla.",
    "Responde de forma clara, amable y precisa usando únicamente la información de los fragmentos proporcionados.",
    "Incluye al final una sección de 'Referencias' listando las etiquetas de los fragmentos utilizados.",
    "Si la información es insuficiente, indica claramente que no puedes responder con los datos disponibles.",
    "",
    "Contexto:",
    contextBlock || "No se entregó contexto relevante.",
    "",
    `Pregunta: ${question}`,
  ].join("\n");

  return {
    prompt,
    references: cleanedContext.map((item) => item.reference),
  };
}

function computePageRange(start?: number, end?: number): string | undefined {
  if (typeof start !== "number" && typeof end !== "number") {
    return undefined;
  }
  if (typeof start === "number" && typeof end === "number") {
    if (start === end) return `pág. ${start}`;
    return `págs. ${start}-${end}`;
  }
  if (typeof start === "number") return `pág. ${start}`;
  if (typeof end === "number") return `pág. ${end}`;
  return undefined;
}
