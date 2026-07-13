import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './Combobox.module.scss';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export default function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder,
  emptyMessage = 'Tidak ada data ditemukan.',
}: ComboboxProps) {
  const selectedLabel = options.find((o) => o.value === value)?.label ?? '';
  const [query, setQuery] = useState(selectedLabel);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(selectedLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery(selectedLabel);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLabel]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q === selectedLabel.toLowerCase()) return options;
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, query, selectedLabel]);

  const selectOption = (option: ComboboxOption) => {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
  };

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <input
        id={id}
        type="text"
        autoComplete="off"
        placeholder={placeholder}
        value={query}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (value) onChange('');
        }}
      />
      {isOpen && (
        <div className={styles.dropdown}>
          {filteredOptions.length === 0 ? (
            <div className={styles.empty}>{emptyMessage}</div>
          ) : (
            filteredOptions.map((option) => (
              <div key={option.value} className={styles.option} onMouseDown={() => selectOption(option)}>
                {option.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
