'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

interface KeypadLockProps {
  length: number;
  value: string;
  onChange: (value: string) => void;
  onSubmit: (code: string) => boolean;
  disabled: boolean;
}

export function KeypadLock({
  length,
  value,
  onChange,
  onSubmit,
  disabled,
}: KeypadLockProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const [shaking, setShaking] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
    },
    [],
  );

  function updateValue(nextValue: string) {
    setHasError(false);
    onChange(nextValue.replace(/\D/g, '').slice(0, length));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || value.length !== length) return;

    if (onSubmit(value)) {
      setHasError(false);
      return;
    }

    setHasError(true);
    setShaking(false);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);

    frameRef.current = window.requestAnimationFrame(() => {
      setShaking(true);
      inputRef.current?.focus();
    });
    timeoutRef.current = window.setTimeout(() => setShaking(false), 350);
  }

  return (
    <form
      aria-label="Numeric keypad lock"
      onSubmit={handleSubmit}
      className={`mt-4 space-y-3 ${shaking ? 'keypad-shake' : ''}`}
    >
      <label htmlFor={inputId} className="block text-sm font-medium text-slate-200">
        Enter the {length}-digit code
      </label>
      <input
        ref={inputRef}
        id={inputId}
        value={value}
        onChange={(event) => updateValue(event.target.value)}
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={length}
        aria-invalid={hasError}
        aria-describedby={`${inputId}-help ${inputId}-error`}
        disabled={disabled}
        className="min-h-12 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-center font-mono text-xl tracking-[0.4em] text-white placeholder:text-slate-600"
        placeholder={'•'.repeat(length)}
      />
      <p id={`${inputId}-help`} className="text-xs text-slate-400">
        Type the code or use the keypad buttons.
      </p>
      <p
        id={`${inputId}-error`}
        role="alert"
        className={`min-h-5 text-sm text-rose-300 ${hasError ? '' : 'invisible'}`}
      >
        Incorrect code. Try again.
      </p>

      <div role="group" aria-label="Keypad buttons" className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            aria-label={`Enter ${digit}`}
            disabled={disabled || value.length >= length}
            onClick={() => updateValue(`${value}${digit}`)}
            className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 font-mono text-lg text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          aria-label="Clear code"
          disabled={disabled || value.length === 0}
          onClick={() => updateValue('')}
          className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-2 text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          aria-label="Enter 0"
          disabled={disabled || value.length >= length}
          onClick={() => updateValue(`${value}0`)}
          className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 font-mono text-lg text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          0
        </button>
        <button
          type="button"
          aria-label="Delete last digit"
          disabled={disabled || value.length === 0}
          onClick={() => updateValue(value.slice(0, -1))}
          className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-2 text-sm text-slate-200 hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Delete
        </button>
      </div>

      <button
        type="submit"
        disabled={disabled || value.length !== length}
        className="min-h-11 w-full rounded-lg bg-cyan-700 px-4 py-2 font-semibold text-white transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Unlock
      </button>
    </form>
  );
}
