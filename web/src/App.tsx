import { FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { ChatMessageList } from "./components/ChatMessageList";
import { ModelSelector } from "./components/ModelSelector";
import { ReferencesList } from "./components/ReferencesList";

type ChatMessage =
  | { id: string; role: "user"; content: string }
  | { id: string; role: "assistant"; content: string; references?: Reference[] }
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

const MODEL_OPTIONS = [
  { value: "model_3", label: "Model 3" },
  { value: "model_y", label: "Model Y" },
  { value: "model_s", label: "Model S" },
  { value: "model_x", label: "Model X" },
  { value: "cybertruck", label: "Cybertruck" },
] as const;

export default function App() {
  const [model, setModel] = useState<(typeof MODEL_OPTIONS)[number]["value"]>("model_3");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [contextFragments, setContextFragments] = useState<ContextFragment[]>([]);
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
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setContextFragments(data.context ?? []);
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
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Asistente Tesla</h1>
            <p className="text-sm text-slate-400">{conversationHeader}</p>
          </div>
          <ModelSelector
            model={model}
            onChange={(value) => setModel(value as (typeof MODEL_OPTIONS)[number]["value"])}
            options={MODEL_OPTIONS}
            disabled={isLoading}
          />
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-lg shadow-black/30 md:p-6">
          <ChatMessageList messages={messages} isLoading={isLoading} />
        </section>

        {contextFragments.length > 0 && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 md:p-6">
            <h2 className="text-lg font-semibold text-white">Fragmentos utilizados</h2>
            <p className="mb-4 text-sm text-slate-400">
              Estos son los fragmentos del manual que alimentaron la respuesta del asistente.
            </p>
            <div className="space-y-3">
              {contextFragments.map((fragment) => (
                <article
                  key={fragment.label}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-white">{fragment.label}</span>
                    {typeof fragment.score === "number" && (
                      <span className="text-xs text-slate-500">score: {fragment.score.toFixed(3)}</span>
                    )}
                  </div>
                  <p className="whitespace-pre-line text-slate-200">{fragment.text}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4 shadow-inner shadow-black/30 md:p-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            <label htmlFor="question" className="text-sm font-medium text-slate-300">
              Escribe tu pregunta
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ej: ¿Cuál es la presión recomendada de neumáticos para mi Model Y?"
              className="min-h-[120px] rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 shadow-inner shadow-black/40 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
              disabled={isLoading}
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <ReferencesList messages={messages} />
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center justify-center rounded-xl bg-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-400 focus:ring-2 focus:ring-blue-400/60 disabled:cursor-not-allowed disabled:bg-blue-500/40"
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
