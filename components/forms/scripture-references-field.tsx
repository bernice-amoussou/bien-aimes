"use client";

import { Plus, X } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { FieldError, FieldHint, Input } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/locale-provider";

export interface ReferenceRow {
  id: string;
  value: string;
}

interface Props {
  idPrefix: string;
  rows: ReferenceRow[];
  onChange: (rows: ReferenceRow[]) => void;
  /** Erreur globale (aucune référence) ou par ligne (référence vide). */
  error?: string;
  rowErrors?: Record<string, string>;
}

let nextRowId = 0;
export function createReferenceRow(value = ""): ReferenceRow {
  nextRowId += 1;
  return { id: `ref-${nextRowId}`, value };
}

export function ScriptureReferencesField({ idPrefix, rows, onChange, error, rowErrors = {} }: Props) {
  const { t } = useI18n();
  const inputsRef = useRef(new Map<string, HTMLInputElement>());
  const hintId = `${idPrefix}-hint`;
  const errorId = `${idPrefix}-error`;

  function focusRow(id: string) {
    requestAnimationFrame(() => inputsRef.current.get(id)?.focus());
  }

  function addRow() {
    const row = createReferenceRow();
    onChange([...rows, row]);
    focusRow(row.id);
  }

  function removeRow(index: number) {
    const next = rows.filter((_, i) => i !== index);
    onChange(next.length > 0 ? next : [createReferenceRow()]);
    const neighbour = next[Math.max(0, index - 1)];
    if (neighbour) focusRow(neighbour.id);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>, index: number) {
    // Entrée sur la dernière ligne non vide : on ajoute une ligne au lieu d'envoyer le formulaire.
    if (event.key === "Enter") {
      event.preventDefault();
      if (index === rows.length - 1 && rows[index].value.trim()) addRow();
      else if (rows[index + 1]) focusRow(rows[index + 1].id);
    }
  }

  return (
    <fieldset aria-describedby={`${hintId}${error ? ` ${errorId}` : ""}`}>
      <legend className="mb-2 flex items-baseline gap-1.5 text-[15px] font-medium text-ink">
        {t.form.references}
        <span aria-hidden="true" className="text-danger-600">
          *
        </span>
      </legend>
      <ul className="space-y-2">
        {rows.map((row, index) => {
          const rowError = rowErrors[row.id];
          const inputId = `${idPrefix}-${row.id}`;
          return (
            <li key={row.id}>
              <div className="flex items-center gap-2">
                <label htmlFor={inputId} className="sr-only">
                  {t.form.referenceLabel(index + 1)}
                </label>
                <Input
                  id={inputId}
                  ref={(node) => {
                    if (node) inputsRef.current.set(row.id, node);
                    else inputsRef.current.delete(row.id);
                  }}
                  value={row.value}
                  placeholder={t.form.referencePlaceholder}
                  onChange={(e) =>
                    onChange(rows.map((r) => (r.id === row.id ? { ...r, value: e.target.value } : r)))
                  }
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  aria-invalid={rowError || (error && index === 0) ? true : undefined}
                  aria-describedby={rowError ? `${inputId}-error` : undefined}
                  aria-required={index === 0}
                />
                <IconButton
                  label={t.form.removeReference(index + 1)}
                  onClick={() => removeRow(index)}
                  disabled={rows.length === 1 && !row.value}
                >
                  <X aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </IconButton>
              </div>
              <FieldError id={`${inputId}-error`}>{rowError}</FieldError>
            </li>
          );
        })}
      </ul>
      <FieldError id={errorId}>{error}</FieldError>
      <FieldHint id={hintId}>{t.form.referencesHint}</FieldHint>
      <div className="mt-3">
        <Button variant="secondary" onClick={addRow} className="w-full sm:w-auto">
          <Plus aria-hidden="true" className="size-4" strokeWidth={1.75} />
          {t.form.addReference}
        </Button>
      </div>
    </fieldset>
  );
}
