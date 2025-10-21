type Option = {
  value: string;
  label: string;
};

type Props = {
  model: string;
  options: readonly Option[];
  disabled?: boolean;
  onChange: (value: Option["value"]) => void;
};

export function ModelSelector({ model, onChange, options, disabled }: Props) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor="model" className="font-medium text-slate-300">
        Modelo de Tesla
      </label>
      <select
        id="model"
        value={model}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2 text-sm text-slate-100 shadow-inner shadow-black/30 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40 disabled:cursor-not-allowed disabled:text-slate-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
