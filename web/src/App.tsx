import { FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { ChatMessageList } from "./components/ChatMessageList";
import { ModelSelector, type ModelOption } from "./components/ModelSelector";
import { ReferencesList } from "./components/ReferencesList";

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; references?: Reference[]; context?: ContextFragment[] }
  | { id: string; role: "system"; content: string };

type Reference = {
  label: string;
  model: string;
  document: string;
  pages?: string;
};

type ContextFragment = {
  label: string;
  text: string;
  metadata: Record<string, unknown>;
  score?: number;
};

const MODEL_OPTIONS: readonly ModelOption[] = [
  {
    value: "model_3",
    label: "Model 3",
    tagline: "Sedán eléctrico",
    productionYears: "2021-presente",
    imageSrc: "/models/model-3.png",
  },
  {
    value: "model_y",
    label: "Model Y",
    tagline: "SUV compacto",
    productionYears: "2020-presente",
    imageSrc: "/models/model-y.png",
  },
  {
    value: "model_s",
    label: "Model S",
    tagline: "Sedán premium",
    productionYears: "2012-presente",
    imageSrc: "/models/model-s.png",
  },
  {
    value: "model_x",
    label: "Model X",
    tagline: "SUV con puertas Falcon Wing",
    productionYears: "2015-presente",
    imageSrc: "/models/model-x.png",
  },
  {
    value: "cybertruck",
    label: "Cybertruck",
    tagline: "Pickup futurista",
    productionYears: "2023-presente",
    imageSrc: "/models/cybertruck.png",
  },
] as const;

export default function App() {
  const [model, setModel] = useState<(typeof MODEL_OPTIONS)[number]["value"]>("model_3");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = question.trim().length > 0 && !isLoading;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    const trimmedQuestion = question.trim();
    setQuestion("");
    setError(null);
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedQuestion,
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const { data } = await axios.post<{
        answer: string;
        references: Reference[];
        context: ContextFragment[];
      }>("/api/chat", {
        model,
        question: trimmedQuestion,
      });

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.answer,
        references: data.references,
        context: data.context ?? [],
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (requestError) {
      console.error(requestError);
      const serverMessage =
        axios.isAxiosError(requestError) && requestError.response?.data?.error
          ? String(requestError.response.data.error)
          : "Ocurrió un error. Intenta nuevamente.";

      setError(serverMessage);
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "system",
        content: serverMessage,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const conversationHeader = useMemo(() => {
    const current = MODEL_OPTIONS.find((item) => item.value === model);
    return current ? `Consultas para ${current.label}` : "Chat Tesla";
  }, [model]);

  return (
    <div className="min-h-screen bg-[#f5f6f7] text-[#171A20]">
      <header className="border-b border-neutral-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-lg font-semibold tracking-[0.6em] text-[#171A20]">TESLA</span>
          <span className="text-xs uppercase tracking-[0.3em] text-neutral-500">Soporte</span>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-12 px-6 pb-16">
        <section className="flex flex-col items-center gap-6 pt-12 text-center">
          <span className="text-xs uppercase tracking-[0.4em] text-neutral-500">Manual del propietario</span>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold md:text-5xl">Asistente Tesla</h1>
            <p className="mx-auto max-w-2xl text-base text-neutral-600">
              {conversationHeader}. Realiza preguntas sobre funciones, mantenimiento o configuraciones y recibe
              respuestas basadas en los manuales oficiales.
            </p>
          </div>
        </section>

        <ModelSelector
          model={model}
          onChange={(value) => setModel(value as (typeof MODEL_OPTIONS)[number]["value"])}
          options={MODEL_OPTIONS}
          disabled={isLoading}
        />

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_12px_24px_rgba(0,0,0,0.05)] md:p-8">
          <ChatMessageList messages={messages} isLoading={isLoading} />
        </section>

        <section className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_12px_24px_rgba(0,0,0,0.04)] md:p-8">
          <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
            )}
            <label htmlFor="question" className="text-sm font-medium text-neutral-700">
              Escribe tu pregunta
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ej: ¿Cuál es la presión recomendada de neumáticos para mi Model Y?"
              className="min-h-[140px] rounded-2xl border border-neutral-200 bg-[#f8f9fb] px-4 py-3 text-sm text-[#171A20] shadow-inner shadow-black/5 outline-none transition focus:border-[#171A20] focus:ring-4 focus:ring-black/10"
              disabled={isLoading}
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <ReferencesList messages={messages} />
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center rounded-full bg-[#171A20] px-8 py-3 text-sm font-semibold text-white transition hover:bg-black focus:ring-4 focus:ring-black/10 disabled:cursor-not-allowed disabled:bg-neutral-400 disabled:text-white/70"
              >
                {isLoading ? "Consultando..." : "Enviar pregunta"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
