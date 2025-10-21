import { Router } from "express";
import { z } from "zod";
import { nomicClient } from "../services/nomicClient.js";
import { llmClient } from "../services/llmClient.js";
import { buildPrompt } from "../services/promptBuilder.js";
import { logger } from "../logger.js";
const requestSchema = z.object({
    model: z.string().min(1, "model es obligatorio"),
    question: z.string().min(1, "question es obligatorio"),
});
const MODEL_ALIAS = {
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
function normalizeModel(value) {
    const cleaned = value.trim().toLowerCase();
    if (MODEL_ALIAS[cleaned])
        return MODEL_ALIAS[cleaned];
    const withUnderscore = cleaned.replace(/[\s-]+/g, "_");
    return MODEL_ALIAS[withUnderscore];
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
        const chunks = await nomicClient.search(question, modelSlug);
        if (chunks.length === 0) {
            return res.status(404).json({ error: "No se encontraron fragmentos relevantes para la consulta" });
        }
        const { prompt, references } = buildPrompt(question, chunks);
        let answer;
        try {
            answer = await llmClient.generateCompletion(prompt);
        }
        catch (error) {
            logger.error({ err: error }, "Fallo al consultar LLM");
            return res.status(502).json({ error: "No se pudo obtener respuesta del modelo de lenguaje" });
        }
        res.json({
            answer,
            references,
            context: chunks.map((chunk, index) => ({
                label: references[index]?.label ?? `R${index + 1}`,
                text: chunk.text,
                metadata: chunk.metadata,
                score: chunk.score,
            })),
        });
    }
    catch (error) {
        next(error);
    }
});
