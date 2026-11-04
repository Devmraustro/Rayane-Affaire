import * as React from 'react';
import { cn } from '@/lib/utils';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, invalid, ...props }, ref) => (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full rounded-xl border border-sand-300 bg-white px-3.5 text-sm text-ink placeholder:text-ink-300',
        'transition-colors hover:border-sand-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200',
        'disabled:cursor-not-allowed disabled:bg-sand-100',
        invalid && 'border-danger focus:border-danger focus:ring-danger/20',
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(({ className, invalid, ...props }, ref) => (
  <textarea
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      'min-h-[7.5rem] w-full rounded-xl border border-sand-300 bg-white px-3.5 py-3 text-sm text-ink placeholder:text-ink-300',
      'transition-colors hover:border-sand-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200',
      invalid && 'border-danger focus:border-danger focus:ring-danger/20',
      className,
    )}
    {...props}
  />
));
Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(({ className, invalid, children, ...props }, ref) => (
  <select
    ref={ref}
    aria-invalid={invalid || undefined}
    className={cn(
      'h-11 w-full appearance-none rounded-xl border border-sand-300 bg-white bg-[length:1rem] bg-[right_0.85rem_center] bg-no-repeat px-3.5 pe-9 text-sm text-ink',
      "bg-[url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' fill='none' stroke='%2385858D' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m4 6 4 4 4-4'/%3E%3C/svg%3E\")]",
      'transition-colors hover:border-sand-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-200',
      invalid && 'border-danger focus:border-danger focus:ring-danger/20',
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = 'Select';

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[0.8125rem] font-medium text-ink-700">
        {label}
        {required && <span className="ms-1 text-gold-700">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-ink-400">{hint}</p>}
      {error && (
        <p role="alert" className="text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
