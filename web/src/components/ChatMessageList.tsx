import { memo } from "react";
import clsx from "clsx";

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

type Props = {
  messages: ChatMessage[];
  isLoading: boolean;
};

export const ChatMessageList = memo(function ChatMessageList({ messages, isLoading }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center">
        <span className="text-xl font-medium text-[#171A20]">Primera pregunta</span>
        <p className="max-w-xl text-sm text-neutral-500">
          Selecciona el modelo de tu Tesla, redacta una consulta y el asistente consultara los manuales oficiales para
          entregar la mejor respuesta posible.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {messages.map((message) => (
        <article
          key={message.id}
          className={clsx(
            "rounded-3xl border p-6 shadow-[0_12px_24px_rgba(0,0,0,0.05)] transition",
            message.role === "user" && "border-[#171A20]/20 bg-[#f8f9fb]",
            message.role === "assistant" && "border-emerald-500/30 bg-white",
            message.role === "system" && "border-amber-400/40 bg-white",
          )}
        >
          <header className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
            <span>
              {message.role === "user" && "Usuario"}
              {message.role === "assistant" && "Asistente"}
              {message.role === "system" && "Sistema"}
            </span>
          </header>
          <p className="whitespace-pre-line text-sm leading-relaxed text-[#171A20]">{message.content}</p>

          {message.role === "assistant" && message.references && message.references.length > 0 && (
            <footer className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-700">
              <p className="mb-2 font-semibold uppercase tracking-[0.2em] text-emerald-600">Referencias</p>
              <ul className="space-y-2">
                {message.references.map((reference) => (
                  <li key={reference.label}>
                    <strong className="text-emerald-700">{reference.label}:</strong>{" "}
                    <span className="text-emerald-600">{reference.document}</span>
                    {reference.pages && <span className="text-emerald-600"> - {reference.pages}</span>}
                  </li>
                ))}
              </ul>

              {message.context && message.context.length > 0 && (
                <details className="mt-4 overflow-hidden rounded-xl border border-emerald-200 bg-white text-left transition">
                  <summary className="cursor-pointer px-4 py-3 text-emerald-700 outline-none transition hover:bg-emerald-100 marker:text-transparent">
                    Fragmentos utilizados
                  </summary>
                  <div className="space-y-3 px-4 pb-4 pt-2 text-neutral-700">
                    {message.context.map((fragment) => (
                      <article key={fragment.label} className="space-y-2 rounded-lg border border-neutral-200 bg-[#f9f9fb] p-3">
                        <header className="flex items-center justify-between text-xs font-medium text-[#171A20]">
                          <span>{fragment.label}</span>
                          {typeof fragment.score === "number" && (
                            <span className="text-[10px] font-normal text-neutral-500">score {fragment.score.toFixed(3)}</span>
                          )}
                        </header>
                        <p className="whitespace-pre-line text-xs leading-relaxed text-neutral-600">{fragment.text}</p>
                      </article>
                    ))}
                  </div>
                </details>
              )}
            </footer>
          )}
        </article>
      ))}

      {isLoading && (
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-ping rounded-full bg-[#171A20]"></span>
          <span className="text-sm text-neutral-500">Buscando fragmentos relevantes...</span>
        </div>
      )}
    </div>
  );
});
