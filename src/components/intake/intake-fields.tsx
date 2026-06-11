import type { IntakeFieldErrors } from "@/lib/intake/validation";

type FieldProps = {
  label: string;
  name: string;
  value: string | number;
  error?: string[];
  type?: string;
  min?: number;
  children?: React.ReactNode;
  onChange?: (value: string) => void;
};

const inputClass =
  "min-h-11 rounded-md border border-stone-300 bg-white px-3 text-base text-stone-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-100";

export function FieldError({ id, messages }: { id: string; messages?: string[] }) {
  if (!messages?.length) {
    return null;
  }

  return (
    <p id={id} className="text-sm font-medium text-red-700">
      {messages[0]}
    </p>
  );
}

export function TextField({ label, name, value, error, type = "text", min, onChange }: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-800">
      {label}
      <input
        name={name}
        type={type}
        min={min}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        aria-describedby={errorId}
        className={inputClass}
      />
      <FieldError id={errorId} messages={error} />
    </label>
  );
}

export function TextAreaField({ label, name, value, error, onChange }: Omit<FieldProps, "type" | "min">) {
  const errorId = `${name}-error`;

  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-800">
      {label}
      <textarea
        name={name}
        defaultValue={value}
        rows={4}
        onChange={(event) => onChange?.(event.target.value)}
        aria-describedby={errorId}
        className={`${inputClass} min-h-28 resize-y py-3`}
      />
      <FieldError id={errorId} messages={error} />
    </label>
  );
}

export function SelectField({
  label,
  name,
  value,
  error,
  children,
  onChange,
}: FieldProps) {
  const errorId = `${name}-error`;

  return (
    <label className="grid gap-2 text-sm font-semibold text-stone-800">
      {label}
      <select
        name={name}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        aria-describedby={errorId}
        className={inputClass}
      >
        {children}
      </select>
      <FieldError id={errorId} messages={error} />
    </label>
  );
}

export function interestError(errors: IntakeFieldErrors) {
  return errors.interests;
}
