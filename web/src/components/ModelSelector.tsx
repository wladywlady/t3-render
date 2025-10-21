import clsx from "clsx";

export type ModelOption = {
  value: string;
  label: string;
  tagline: string;
  productionYears: string;
  imageSrc: string;
};

type Props = {
  model: string;
  options: readonly ModelOption[];
  disabled?: boolean;
  onChange: (value: ModelOption["value"]) => void;
};

export function ModelSelector({ model, options, disabled, onChange }: Props) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_12px_24px_rgba(0,0,0,0.06)]">
      <div className="mb-5 space-y-1">
        <h2 className="text-sm font-semibold uppercase tracking-[0.25em] text-neutral-500">
          Selecciona tu vehiculo
        </h2>
        <p className="text-sm text-neutral-500">
          Elige el modelo para personalizar la busqueda en los manuales oficiales.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {options.map((option) => {
          const isActive = option.value === model;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={clsx(
                "group flex h-full flex-col overflow-hidden rounded-3xl border text-left transition",
                "focus:outline-none focus-visible:ring-4 focus-visible:ring-black/10 disabled:cursor-not-allowed",
                isActive
                  ? "border-[#171A20] bg-[#171A20] text-white shadow-[0_16px_32px_rgba(0,0,0,0.12)]"
                  : "border-neutral-200 bg-white hover:border-[#171A20] hover:shadow-[0_12px_24px_rgba(0,0,0,0.08)]",
              )}
            >
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <img
                  src={option.imageSrc}
                  alt={`Tesla ${option.label}`}
                  className={clsx(
                    "h-full w-full object-cover transition-transform duration-500",
                    "group-hover:scale-105",
                  )}
                  loading="lazy"
                />
                <div
                  className={clsx(
                    "absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity",
                    isActive ? "opacity-70" : "opacity-60 group-hover:opacity-80",
                  )}
                ></div>
              </div>
              <div className="flex flex-1 flex-col gap-3 px-5 pb-6 pt-5">
                <span
                  className={clsx(
                    "text-xs uppercase tracking-[0.3em]",
                    isActive ? "text-white/70" : "text-neutral-500",
                  )}
                >
                  {option.productionYears}
                </span>
                <span className="text-2xl font-semibold tracking-tight">{option.label}</span>
                <span className={clsx("text-sm leading-relaxed", isActive ? "text-white/70" : "text-neutral-500")}>
                  {option.tagline}
                </span>
                <span
                  className={clsx(
                    "mt-auto inline-flex items-center gap-2 text-sm font-medium",
                    isActive ? "text-white" : "text-[#171A20]",
                  )}
                >
                  Consultar manual
                  <span
                    className={clsx(
                      "flex h-6 w-6 items-center justify-center rounded-full border text-[11px] font-semibold transition",
                      isActive ? "border-white/70 text-white" : "border-[#171A20]/40 text-[#171A20]",
                    )}
                  >
                    &gt;
                  </span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
