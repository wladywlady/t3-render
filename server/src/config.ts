import { config as loadEnv } from "dotenv";
import { z } from "zod";

loadEnv();

const envSchema = z.object({
  PORT: z.string().optional(),
  NOMIC_API_KEY: z.string().min(1, "NOMIC_API_KEY es obligatorio"),
  NOMIC_PROJECTION_ID: z.string().uuid("NOMIC_PROJECTION_ID debe ser un UUID válido"),
  NOMIC_K: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined))
    .refine((value) => value === undefined || Number.isInteger(value), {
      message: "NOMIC_K debe ser un entero",
    }),
  LLM_BASE_URL: z.string().url().default("https://asteroide.ing.uc.cl"),
  LLM_MODEL_NAME: z.string().default("integracion"),
  LLM_API_KEY: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Error en variables de entorno:", parsed.error.flatten().fieldErrors);
  throw new Error("Configuración inválida");
}

const env = parsed.data;

export const appConfig = {
  port: env.PORT ? Number(env.PORT) : 3000,
  nomic: {
    apiKey: env.NOMIC_API_KEY,
    projectionId: env.NOMIC_PROJECTION_ID,
    k: env.NOMIC_K ?? 6,
  },
  llm: {
    baseUrl: env.LLM_BASE_URL.replace(/\/$/, ""),
    model: env.LLM_MODEL_NAME,
    apiKey: env.LLM_API_KEY,
  },
} as const;
