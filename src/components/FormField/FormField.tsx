import type { ReactNode } from 'react';
import styles from './FormField.module.scss';

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  help?: string;
  children: ReactNode;
}

export default function FormField({ label, htmlFor, required, error, help, children }: FormFieldProps) {
  return (
    <div className={[styles.field, error ? styles.fieldError : ''].filter(Boolean).join(' ')}>
      <label className={styles.label} htmlFor={htmlFor}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      {children}
      {error ? <span className={styles.errorText}>{error}</span> : help ? <span className={styles.helpText}>{help}</span> : null}
    </div>
  );
}
