import { useMemo } from "react";

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
};

export function ReferencesList({ messages }: Props) {
  const references = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!lastAssistant || !lastAssistant.references) return [];
    return lastAssistant.references;
  }, [messages]);

  if (references.length === 0) {
    return <span className="text-xs text-slate-500">La respuesta mostrará las referencias utilizadas.</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
      <span className="font-semibold uppercase tracking-wide text-slate-400">Referencias:</span>
      {references.map((reference) => (
        <span
          key={reference.label}
          className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-xs text-slate-200"
        >
          {reference.label} · {reference.model}
          {reference.pages ? ` · ${reference.pages}` : ""}
        </span>
      ))}
    </div>
  );
}
