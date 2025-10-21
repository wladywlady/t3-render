import axios, { AxiosInstance } from "axios";
import { appConfig } from "../config.js";

type GenerateResponse = {
  response?: string;
  done?: boolean;
  message?: string;
};

export class LlmClient {
  private readonly http: AxiosInstance;
  private readonly model: string;

  constructor() {
    this.model = appConfig.llm.model;
    this.http = axios.create({
      baseURL: appConfig.llm.baseUrl,
      headers: {
        "Content-Type": "application/json",
        ...(appConfig.llm.apiKey ? { Authorization: `Bearer ${appConfig.llm.apiKey}` } : {}),
      },
      timeout: 40_000,
    });
  }

  async generateCompletion(prompt: string): Promise<string> {
    const { data } = await this.http.post<GenerateResponse>("/api/generate", {
      model: this.model,
      prompt,
      stream: false,
    });

    if (typeof data?.response !== "string" || data.response.trim().length === 0) {
      throw new Error("Respuesta vacía desde el LLM");
    }

    return data.response.trim();
  }
}

export const llmClient = new LlmClient();
