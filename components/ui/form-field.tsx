import * as React from "react";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  error?: string | null;
  helper?: string;
  required?: boolean;
}

export function FormField({
  label,
  htmlFor,
  error,
  helper,
  required,
  className,
  children,
  ...props
}: FormFieldProps) {
  const generatedId = React.useId();
  const inputId = htmlFor || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const describedBy = error ? errorId : helper ? helperId : undefined;

  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      const childProps = child.props as Record<string, unknown>;
      const isControl =
        typeof child.type === "string" &&
        ["input", "textarea", "select"].includes(child.type);
      if (!isControl) return child;
      return React.cloneElement(child as React.ReactElement<{
        id?: string;
        "aria-invalid"?: boolean;
        "aria-describedby"?: string;
      }>, {
        id: (childProps.id as string) || inputId,
        "aria-invalid": !!error,
        "aria-describedby": describedBy,
      });
    }
    return child;
  });

  return (
    <div className={cn("flex flex-col", className)} {...props}>
      {label ? (
        <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-200">
          {label} {required && <span className="text-accent-400">*</span>}
        </label>
      ) : null}
      
      {enhancedChildren}

      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs text-red-400">
          {error}
        </p>
      ) : helper ? (
        <p id={helperId} className="mt-1.5 text-xs text-ink-500">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
