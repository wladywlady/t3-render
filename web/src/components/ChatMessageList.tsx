import { memo } from "react";
import clsx from "clsx";

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

type Props = {
  messages: ChatMessage[];
  isLoading: boolean;
};

export const ChatMessageList = memo(function ChatMessageList({ messages, isLoading }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 p-10 text-center text-slate-400">
        <span className="text-lg font-medium text-slate-200">¿Primera pregunta?</span>
        <p className="max-w-xl text-sm text-slate-400">
          Selecciona el modelo de tu Tesla, redacta una consulta y el asistente buscará en los manuales oficiales para
          elaborar la mejor respuesta posible.
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
            "rounded-2xl border p-4 shadow-sm transition",
            message.role === "user" && "border-blue-500/40 bg-blue-900/10 text-blue-100 shadow-blue-900/20",
            message.role === "assistant" && "border-emerald-500/20 bg-emerald-900/10 text-emerald-100 shadow-emerald-900/20",
            message.role === "system" && "border-amber-500/20 bg-amber-900/10 text-amber-100 shadow-amber-900/20",
          )}
        >
          <header className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-slate-300/70">
            <span>
              {message.role === "user" && "Usuario"}
              {message.role === "assistant" && "Asistente"}
              {message.role === "system" && "Sistema"}
            </span>
          </header>
          <p className="whitespace-pre-line text-sm leading-relaxed text-current">{message.content}</p>

          {message.role === "assistant" && message.references && message.references.length > 0 && (
            <footer className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-900/20 p-3 text-xs text-emerald-100">
              <p className="mb-2 font-semibold uppercase tracking-wide text-emerald-200">Referencias aportadas</p>
              <ul className="space-y-1">
                {message.references.map((reference) => (
                  <li key={reference.label}>
                    <strong className="text-emerald-100">{reference.label}:</strong>{" "}
                    <span className="text-emerald-200">{reference.document}</span>
                    {reference.pages && <span className="text-emerald-300"> · {reference.pages}</span>}
                  </li>
                ))}
              </ul>
            </footer>
          )}
        </article>
      ))}

      {isLoading && (
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 animate-ping rounded-full bg-blue-400"></span>
          <span className="text-sm text-slate-400">Buscando fragmentos relevantes...</span>
        </div>
      )}
    </div>
  );
});
