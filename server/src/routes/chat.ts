import { Router } from "express";
import { z } from "zod";
import { nomicClient, type RetrievedChunk } from "../services/nomicClient.js";
import { llmClient } from "../services/llmClient.js";
import { buildPrompt } from "../services/promptBuilder.js";
import { logger } from "../logger.js";

const MIN_NORMALIZED_SCORE = 0.35;
const STOPWORDS = new Set([
  "el",
  "la",
  "los",
  "las",
  "un",
  "una",
  "unos",
  "unas",
  "de",
  "del",
  "y",
  "o",
  "u",
  "a",
  "en",
  "por",
  "para",
  "con",
  "se",
  "que",
  "cual",
  "cuales",
  "como",
  "cuando",
  "donde",
  "porque",
  "sobre",
  "sin",
  "al",
  "su",
  "sus",
  "mi",
  "mis",
  "tu",
  "tus",
  "es",
  "son",
  "ser",
  "esta",
  "este",
  "estos",
  "estas",
  "lo",
  "ya",
  "si",
  "no",
]);

const requestSchema = z.object({
  model: z.string().min(1, "model es obligatorio"),
  question: z.string().min(1, "question es obligatorio"),
});

const MODEL_ALIAS: Record<string, string> = {
  model_s: "model_s",
  models: "model_s",
  "model-s": "model_s",
  modelx: "model_x",
  model_x: "model_x",
  "model-x": "model_x",
  model3: "model_3",
  model_3: "model_3",
  "model-3": "model_3",
  modely: "model_y",
  model_y: "model_y",
  "model-y": "model_y",
  cybertruck: "cybertruck",
};

function normalizeModel(value: string): string | undefined {
  const cleaned = value.trim().toLowerCase();
  if (MODEL_ALIAS[cleaned]) return MODEL_ALIAS[cleaned];
  const withUnderscore = cleaned.replace(/[\s-]+/g, "_");
  return MODEL_ALIAS[withUnderscore];
}

function normalizeScore(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  if (value >= 0 && value <= 1) {
    return value;
  }
  if (value < 0) {
    return 0;
  }
  // Interpret valores mayores que 1 como distancias (menor es mejor)
  return 1 / (1 + value);
}

function normalizePlain(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function toWords(value: string): string[] {
  return normalizePlain(value)
    .split(/[^a-z0-9]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

function extractTerms(question: string): string[] {
  const words = toWords(question);
  const filtered = words.filter((word) => !STOPWORDS.has(word));
  return Array.from(new Set(filtered));
}

function hasOverlap(terms: string[], text: string): boolean {
  if (terms.length === 0) return true;
  const chunkWords = new Set(toWords(text));
  return terms.some((term) => chunkWords.has(term));
}

export const chatRouter = Router();

chatRouter.post("/", async (req, res, next) => {
  try {
    const parsed = requestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    }

    const modelSlug = normalizeModel(parsed.data.model);
    if (!modelSlug) {
      return res.status(400).json({ error: "Modelo no reconocido" });
    }

    const question = parsed.data.question.trim();
    let chunks: RetrievedChunk[];
    try {
      chunks = await nomicClient.search(question, modelSlug);
    } catch (error) {
      logger.error({ err: error }, "Fallo al recuperar fragmentos desde Nomic");
      return res.status(502).json({ error: "No se pudo recuperar información para la consulta." });
    }

    if (chunks.length === 0) {
      return res.status(404).json({ error: "No se encontraron fragmentos relacionados con la consulta." });
    }

    const questionTerms = extractTerms(question);
    const relevantChunks = chunks.filter(
      (chunk) => normalizeScore(chunk.score) >= MIN_NORMALIZED_SCORE && hasOverlap(questionTerms, chunk.text),
    );
    if (relevantChunks.length === 0) {
      return res.status(404).json({ error: "No se encontraron fragmentos relacionados con la consulta." });
    }

    const { prompt, references } = buildPrompt(question, relevantChunks);

    let answer: string;
    try {
      answer = await llmClient.generateCompletion(prompt);
    } catch (error) {
      logger.error({ err: error }, "Fallo al consultar LLM");
      return res.status(502).json({ error: "No se pudo generar una respuesta con el modelo de lenguaje." });
    }

    res.json({
      answer,
      references,
      context: relevantChunks.map((chunk, index) => ({
        label: references[index]?.label ?? `R${index + 1}`,
        text: chunk.text,
        metadata: chunk.metadata,
        score: chunk.score,
      })),
    });
  } catch (error) {
    next(error);
  }
});
