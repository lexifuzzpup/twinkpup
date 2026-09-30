import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
    id: string;
    label: string;
    error?: string;
}

export function Field({ id, label, error, ...input }: FieldProps) {
    return (
        <section>
            <label htmlFor={id + "-input"}>{label}</label>
            <span className="error">{error}</span>
            <input id={id + "-input"} required {...input} />
        </section>
    );
}
