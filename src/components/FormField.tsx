// Primitives de formulaire réutilisables (sans balise <form> HTML).

import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor: string;
  children: ReactNode;
  hint?: string;
}

export function Field({ label, htmlFor, children, hint }: FieldProps) {
  return (
    <div className="mb-4">
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-ardoise-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-ardoise-500">{hint}</p>}
    </div>
  );
}

const inputClasses =
  'w-full rounded-lg border border-ardoise-200 bg-white px-3 py-2 text-ardoise-900 ' +
  'focus:border-sapin-600 focus:outline-none focus:ring-2 focus:ring-sapin-600/20';

interface TextInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'password';
  placeholder?: string;
  inputMode?: 'decimal' | 'numeric' | 'text';
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

export function TextInput({ id, value, onChange, type = 'text', placeholder, inputMode, onKeyDown }: TextInputProps) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      inputMode={inputMode}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={onKeyDown}
      className={inputClasses}
    />
  );
}

interface SelectInputProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}

export function SelectInput({ id, value, onChange, options }: SelectInputProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={inputClasses}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

interface CheckboxProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

export function Checkbox({ id, checked, onChange, label }: CheckboxProps) {
  return (
    <label htmlFor={id} className="mb-4 flex items-center gap-2 text-sm text-ardoise-700">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-ardoise-200 text-sapin-600 focus:ring-sapin-600/20"
      />
      {label}
    </label>
  );
}

interface ButtonProps {
  onClick: () => void;
  children: ReactNode;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
}

export function Button({ onClick, children, variant = 'primary', disabled }: ButtonProps) {
  const base = 'rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50';
  const styles =
    variant === 'primary'
      ? 'bg-sapin-700 text-white hover:bg-sapin-800'
      : 'text-ardoise-700 hover:bg-ardoise-100';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
