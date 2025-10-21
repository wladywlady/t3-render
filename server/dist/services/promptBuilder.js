export function buildPrompt(question, contexts) {
    const cleanedContext = contexts.map((chunk, index) => {
        const modelName = chunk.metadata.model_name ?? chunk.metadata.model_slug ?? "Manual Tesla";
        const documentTitle = chunk.metadata.document_title ?? modelName;
        const pages = computePageRange(chunk.metadata.page_start, chunk.metadata.page_end);
        const label = pages ? `${documentTitle} (${pages})` : documentTitle;
        const referenceLabel = `R${index + 1}`;
        return {
            label,
            text: chunk.text.trim(),
            reference: {
                label: referenceLabel,
                model: modelName,
                document: documentTitle,
                pages,
            },
        };
    });
    const contextBlock = cleanedContext
        .map((item) => `(${item.reference.label}) ${item.label}\n${item.text}`)
        .join("\n\n");
    const prompt = [
        "Eres un asistente de soporte de Tesla.",
        "Tu tarea es responder preguntas de los usuarios de manera clara, precisa yamigable, como lo haría una persona experta.",
        "No muestres directamente los fragmentos de los manuales, pero utiliza su información como contexto para elaborar la respuesta.",
        "Contexto:",
        contextBlock || "No se entrego contexto relevante.",
        "",
        `Pregunta: ${question}`,
    ].join("\n");
    return {
        prompt,
        references: cleanedContext.map((item) => item.reference),
    };
}
function computePageRange(start, end) {
    if (typeof start !== "number" && typeof end !== "number") {
        return undefined;
    }
    if (typeof start === "number" && typeof end === "number") {
        if (start === end)
            return `pag. ${start}`;
        return `pags. ${start}-${end}`;
    }
    if (typeof start === "number")
        return `pag. ${start}`;
    if (typeof end === "number")
        return `pag. ${end}`;
    return undefined;
}
