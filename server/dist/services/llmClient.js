import axios from "axios";
import { appConfig } from "../config.js";
export class LlmClient {
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
    async generateCompletion(prompt) {
        const { data } = await this.http.post("/api/generate", {
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
