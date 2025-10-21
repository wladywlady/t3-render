import axios, { AxiosInstance } from "axios";
import { appConfig } from "../config.js";
import { logger } from "../logger.js";

export type RetrievedChunk = {
  text: string;
  metadata: {
    model_key?: string;
    model_slug?: string;
    model_name?: string;
    document_title?: string;
    page_start?: number;
    page_end?: number;
    source_file?: string;
    [key: string]: unknown;
  };
  score?: number;
};

type RawVectorItem = {
  text?: string;
  metadata?: unknown;
  score?: number;
  distance?: number;
  relevance?: number;
  _similarity?: number;
  meta?: unknown;
  data?: {
    text?: string;
    metadata?: unknown;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

const VECTOR_SEARCH_PATH = "/query/topk";

export class NomicClient {
  private readonly http: AxiosInstance;
  private readonly projectionId: string;
  private readonly k: number;

  constructor() {
    this.http = axios.create({
      baseURL: "https://api-atlas.nomic.ai/v1",
      headers: {
        Authorization: `Bearer ${appConfig.nomic.apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20_000,
    });
    this.projectionId = appConfig.nomic.projectionId;
    this.k = appConfig.nomic.k;
  }

  async search(query: string, modelSlug?: string): Promise<RetrievedChunk[]> {
    const desiredK = this.k;
    const initialK = Math.max(desiredK * 3, desiredK);
    const payload: Record<string, unknown> = {
      projection_id: this.projectionId,
      k: initialK,
      query,
      fields: ["text", "metadata"],
    };

    let rawItems: RawVectorItem[] = [];
    try {
      const { data } = await this.http.post(VECTOR_SEARCH_PATH, payload);
      rawItems = this.extractItems(data);
    } catch (error) {
      logger.warn({ err: error }, "Fallo consulta Nomic; intentando sin selección");
      const { data } = await this.http.post(VECTOR_SEARCH_PATH, {
        projection_id: this.projectionId,
        k: initialK,
        query,
        fields: ["text", "metadata"],
      });
      rawItems = this.extractItems(data);
    }

    if (rawItems.length === 0) {
      return [];
    }

    const mapped = rawItems
      .map<RetrievedChunk | null>((item) => {
        const text = typeof item.text === "string" ? item.text : typeof item.data?.text === "string" ? item.data.text : null;
        const metadataRaw = this.parseMetadata(item);

        if (!text) {
          return null;
        }

        const modelKey = typeof metadataRaw.model_key === "string" ? metadataRaw.model_key : undefined;
        const modelSlug = typeof metadataRaw.model_slug === "string" ? metadataRaw.model_slug : undefined;
        const modelName = typeof metadataRaw.model_name === "string" ? metadataRaw.model_name : undefined;
        const documentTitle = typeof metadataRaw.document_title === "string" ? metadataRaw.document_title : undefined;
        const pageStart = typeof metadataRaw.page_start === "number" ? metadataRaw.page_start : undefined;
        const pageEnd = typeof metadataRaw.page_end === "number" ? metadataRaw.page_end : undefined;
        const sourceFile = typeof metadataRaw.source_file === "string" ? metadataRaw.source_file : undefined;

        return {
          text,
          metadata: {
            ...metadataRaw,
            model_key: modelKey,
            model_slug: modelSlug,
            model_name: modelName,
            document_title: documentTitle,
            page_start: pageStart,
            page_end: pageEnd,
            source_file: sourceFile,
          },
          score: this.resolveScore(item),
        };
      })
      .filter((item): item is RetrievedChunk => item !== null);

    const filtered = modelSlug
      ? mapped.filter((item) => item.metadata.model_slug === modelSlug || item.metadata.model_key === modelSlug)
      : mapped;

    const selected = (filtered.length > 0 ? filtered : mapped).slice(0, desiredK);

    return selected;
  }

  private extractItems(data: unknown): RawVectorItem[] {
    if (!data || typeof data !== "object") {
      return [];
    }
    const maybeResults = (data as Record<string, unknown>).results;
    if (Array.isArray(maybeResults)) {
      return maybeResults as RawVectorItem[];
    }
    const maybeMatches = (data as Record<string, unknown>).matches;
    if (Array.isArray(maybeMatches)) {
      return maybeMatches as RawVectorItem[];
    }
    const maybeData = (data as Record<string, unknown>).data;
    if (Array.isArray(maybeData)) {
      return maybeData as RawVectorItem[];
    }
    return [];
  }

  private resolveScore(item: RawVectorItem): number | undefined {
    if (typeof item.score === "number") return item.score;
    if (typeof item.distance === "number") return item.distance;
    if (typeof item.relevance === "number") return item.relevance;
    if (typeof item._similarity === "number") return item._similarity;
    return undefined;
  }

  private parseMetadata(item: RawVectorItem): Record<string, unknown> {
    let metadataSource: unknown = item.metadata ?? item.data?.metadata ?? item.data?.meta ?? item.meta;

    if (typeof metadataSource === "string") {
      try {
        metadataSource = JSON.parse(metadataSource);
      } catch (error) {
        logger.warn({ err: error }, "No se pudo parsear metadata JSON recibida desde Nomic");
        metadataSource = undefined;
      }
    }

    if (!metadataSource || typeof metadataSource !== "object") {
      return {};
    }

    return metadataSource as Record<string, unknown>;
  }
}

export const nomicClient = new NomicClient();
