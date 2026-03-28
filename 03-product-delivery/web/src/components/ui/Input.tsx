import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, iconLeft, iconRight, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
            {label}
          </label>
        )}
        <div className="relative">
          {iconLeft && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {iconLeft}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`
              w-full bg-background border rounded-control
              px-4 py-2.5 text-sm text-text-primary
              placeholder:text-text-tertiary
              focus:outline-none focus:ring-2 focus:ring-lime/30 focus:border-lime/50
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors duration-200
              ${iconLeft ? 'pl-10' : ''}
              ${iconRight ? 'pr-10' : ''}
              ${error ? 'border-danger focus:ring-danger/30' : 'border-border'}
              ${className}
            `}
            {...props}
          />
          {iconRight && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary">
              {iconRight}
            </span>
          )}
        </div>
        {error && <span className="text-xs text-danger">{error}</span>}
        {hint && !error && <span className="text-xs text-text-tertiary">{hint}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';
